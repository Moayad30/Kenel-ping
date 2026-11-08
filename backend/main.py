import os
import uuid
import asyncio
from pathlib import Path
from typing import Optional, List
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Request, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import (
    load_settings, save_settings, SettingsModel,
    load_presets, save_presets, PresetModel,
    load_categories, save_categories, CategoryModel,
    load_routines, save_routines, RoutineModel,
    load_snippets, save_snippets, SnippetModel,
    load_audit, save_audit, PRESETS_DIR, CHIMES_DIR, TEMP_DIR, BASE_DIR
)
from backend.auth import authenticate_admin, create_access_token, require_admin
from backend.audio_engine import (
    audio_engine, detect_language, get_audio_device_info,
    reconnect_bluetooth_speaker, get_paired_bluetooth_devices
)
from backend.tashkeel import diacritize_arabic

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize audio engine queue and volume monitor
    audio_engine.start()
    yield

app = FastAPI(title="Kernel Ping API", version="2.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Request Models -----------------

class LoginRequest(BaseModel):
    username: str
    password: str

class SpeakCustomRequest(BaseModel):
    text: str
    title: Optional[str] = None
    lang: Optional[str] = None

class SpeakCallRequest(BaseModel):
    target: str
    message: Optional[str] = None
    lang: Optional[str] = None

class VolumeRequest(BaseModel):
    volume: int = Field(..., ge=0, le=100)

class TestChimeRequest(BaseModel):
    tone: str  # airport | bell | alert

class TestVoiceRequest(BaseModel):
    voice: str
    text: Optional[str] = None
    lang: Optional[str] = None

class TashkeelRequest(BaseModel):
    text: str

class RoutineSpeakRequest(BaseModel):
    value: str = "1"

class BluetoothReconnectRequest(BaseModel):
    mac: Optional[str] = None

# ----------------- WebSocket -----------------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await audio_engine.connect_ws(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        audio_engine.disconnect_ws(websocket)
    except Exception:
        audio_engine.disconnect_ws(websocket)

# ----------------- Public Endpoints -----------------

@app.get("/api/status")
async def get_status():
    """Returns current audio engine state, active audio device, and cooldown timer."""
    return audio_engine.get_state_dict()

@app.get("/api/categories")
async def get_public_categories():
    """Returns categories for presets."""
    categories = load_categories()
    # Ensure uncategorized exists
    if not any(c.id == "uncategorized" for c in categories):
        categories.append(CategoryModel(
            id="uncategorized",
            name_ar="Uncategorized",
            name_en="Uncategorized",
            icon="Folder",
            color="cyan",
            order=99
        ))
    return sorted(categories, key=lambda c: c.order or 0)

@app.get("/api/presets")
async def get_public_presets():
    """Returns list of announcement presets."""
    presets = load_presets()
    return presets

@app.post("/api/volume")
async def set_public_volume(payload: VolumeRequest):
    """Allows workspace members to adjust device output volume."""
    vol = await audio_engine.set_volume(payload.volume)
    return {"success": True, "volume": vol}

@app.post("/api/speak/preset/{preset_id}")
async def speak_preset(preset_id: str, request: Request, lang: Optional[str] = Query(default=None)):
    """Triggers playback of a predefined announcement preset."""
    can_proceed, remaining = audio_engine.check_cooldown()
    if not can_proceed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining}s before sending another announcement"
        )

    presets = load_presets()
    preset = next((p for p in presets if p.id == preset_id), None)
    if not preset:
        raise HTTPException(
            status_code=404, 
            detail="Preset not found"
        )

    # Use single title & single text regardless of interface language
    speech_text = preset.text or preset.text_ar or preset.text_en or ""
    speech_title = preset.title or preset.title_ar or preset.title_en or preset.id
    
    # Auto-detect language: if Arabic -> Arabic engine, if English -> English engine
    preset_lang = detect_language(speech_text)

    client_ip = request.client.host if request.client else "Local"
    item = await audio_engine.enqueue(
        title=speech_title,
        text=speech_text,
        source="preset",
        preset_id=preset.id,
        sender_ip=client_ip,
        lang=preset_lang
    )
    return {
        "success": True,
        "message": "Queued successfully",
        "item": item
    }

@app.post("/api/speak/custom")
async def speak_custom(payload: SpeakCustomRequest, request: Request):
    """Triggers speech for custom free-form text input."""
    text = payload.text.strip()
    # Auto-detect language
    detected_lang = detect_language(text)
    lang = payload.lang or detected_lang

    if not text:
        raise HTTPException(
            status_code=400, 
            detail="Text cannot be empty"
        )
    if len(text) > 400:
        raise HTTPException(
            status_code=400, 
            detail="Text exceeds 400 characters"
        )

    can_proceed, remaining = audio_engine.check_cooldown()
    if not can_proceed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining}s before sending another announcement"
        )

    client_ip = request.client.host if request.client else "Local"
    title = payload.title or "Free Announcement"
    item = await audio_engine.enqueue(
        title=title,
        text=text,
        source="free_text",
        sender_ip=client_ip,
        lang=detected_lang
    )
    return {
        "success": True, 
        "message": "Queued successfully", 
        "item": item
    }

@app.post("/api/tashkeel")
async def tashkeel_text(payload: TashkeelRequest):
    """Adds Arabic diacritics to text for accurate pronunciation."""
    raw_text = payload.text.strip()
    if not raw_text:
        return {"success": True, "original": "", "diacritized": ""}

    diacritized = diacritize_arabic(raw_text)
    return {
        "success": True,
        "original": raw_text,
        "diacritized": diacritized
    }

@app.post("/api/speak/call")
async def speak_device_or_person(payload: SpeakCallRequest, request: Request):
    """Triggers an urgent targeted department or person announcement."""
    target = payload.target.strip()
    detected_lang = detect_language(target + (payload.message or ""))

    if not target:
        raise HTTPException(
            status_code=400, 
            detail="Target name required"
        )

    can_proceed, remaining = audio_engine.check_cooldown()
    if not can_proceed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining}s before calling"
        )

    msg = payload.message.strip() if payload.message else ""
    if detected_lang == "en":
        if msg:
            full_text = f"Urgent call for {target}. {msg}"
        else:
            full_text = f"Urgent call for {target}. Please report to the meeting room immediately."
        title = f"Call: {target}"
    else:
        if msg:
            full_text = f"\u0646\u062f\u0627\u0621 \u0639\u0627\u062c\u0644 \u0625\u0644\u0649 {target}\u060c {msg}"
        else:
            full_text = f"\u0646\u062f\u0627\u0621 \u0645\u0648\u062c\u0647 \u0625\u0644\u0649 {target}\u060c \u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u0648\u062c\u0647 \u0625\u0644\u0649 \u0642\u0627\u0639\u0629 \u0627\u0644\u062a\u0646\u0633\u064a\u0642 \u0623\u0648 \u0627\u0644\u0645\u0643\u0627\u062a\u0628 \u0641\u0648\u0631\u0627\u064b."
        title = f"Call: {target}"

    client_ip = request.client.host if request.client else "Local"
    item = await audio_engine.enqueue(
        title=title,
        text=full_text,
        source="device_call",
        sender_ip=client_ip,
        lang=detected_lang
    )
    return {
        "success": True, 
        "message": "Call initiated", 
        "item": item
    }

# ----------------- Routines & Quick Device Actions -----------------

@app.get("/api/routines")
async def get_routines():
    """Returns list of routine announcement templates."""
    return load_routines()

@app.post("/api/routines")
async def create_routine(routine: RoutineModel):
    """Creates a new routine template."""
    routines = load_routines()
    if any(r.id == routine.id for r in routines):
        routine.id = f"routine_{uuid.uuid4().hex[:6]}"
    routines.append(routine)
    save_routines(routines)
    return {"success": True, "routine": routine}

@app.put("/api/routines/{routine_id}")
async def update_routine(routine_id: str, updated: RoutineModel):
    """Updates an existing routine template."""
    routines = load_routines()
    idx = next((i for i, r in enumerate(routines) if r.id == routine_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Routine template not found")
    routines[idx] = updated
    save_routines(routines)
    return {"success": True, "routine": updated}

@app.delete("/api/routines/{routine_id}")
async def delete_routine(routine_id: str):
    """Deletes a routine template."""
    routines = load_routines()
    filtered = [r for r in routines if r.id != routine_id]
    if len(filtered) == len(routines):
        raise HTTPException(status_code=404, detail="Routine template not found")
    save_routines(filtered)
    return {"success": True, "deleted_id": routine_id}

@app.post("/api/routines/{routine_id}/speak")
async def speak_routine(routine_id: str, payload: RoutineSpeakRequest, request: Request):
    """Triggers speech for a routine template with substituted value."""
    can_proceed, remaining = audio_engine.check_cooldown()
    if not can_proceed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining}s before sending another announcement"
        )

    routines = load_routines()
    routine = next((r for r in routines if r.id == routine_id), None)
    if not routine:
        raise HTTPException(status_code=404, detail="Routine template not found")

    val = str(payload.value).strip() if payload.value is not None else "1"
    text = routine.template.replace("{num}", val).replace("{x}", val).replace("{X}", val)
    detected_lang = detect_language(text)

    client_ip = request.client.host if request.client else "Local"
    title = routine.title or f"Routine #{val}"
    item = await audio_engine.enqueue(
        title=title,
        text=text,
        source="routine",
        sender_ip=client_ip,
        lang=detected_lang
    )
    return {
        "success": True,
        "message": "Routine queued successfully",
        "item": item
    }

# ----------------- Quick Snippets / Suggestions -----------------

@app.get("/api/snippets")
async def get_snippets():
    """Returns quick snippet suggestions for free speech input."""
    return load_snippets()

@app.post("/api/snippets")
async def create_snippet(snippet: SnippetModel):
    """Creates a new snippet suggestion."""
    snippets = load_snippets()
    if any(s.id == snippet.id for s in snippets):
        snippet.id = f"snip_{uuid.uuid4().hex[:6]}"
    snippets.append(snippet)
    save_snippets(snippets)
    return {"success": True, "snippet": snippet}

@app.put("/api/snippets/{snippet_id}")
async def update_snippet(snippet_id: str, updated: SnippetModel):
    """Updates an existing snippet suggestion."""
    snippets = load_snippets()
    idx = next((i for i, s in enumerate(snippets) if s.id == snippet_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Snippet not found")
    snippets[idx] = updated
    save_snippets(snippets)
    return {"success": True, "snippet": updated}

@app.delete("/api/snippets/{snippet_id}")
async def delete_snippet(snippet_id: str):
    """Deletes a snippet suggestion."""
    snippets = load_snippets()
    filtered = [s for s in snippets if s.id != snippet_id]
    if len(filtered) == len(snippets):
        raise HTTPException(status_code=404, detail="Snippet not found")
    save_snippets(filtered)
    return {"success": True, "deleted_id": snippet_id}

# ----------------- Remote Bluetooth Management -----------------

@app.get("/api/bluetooth/status")
async def get_bluetooth_status():
    """Returns paired Bluetooth audio devices and current active sink."""
    paired = get_paired_bluetooth_devices()
    device_info = get_audio_device_info()
    settings = load_settings()
    return {
        "paired_devices": paired,
        "configured_mac": settings.bluetooth_speaker_mac,
        "configured_name": settings.bluetooth_speaker_name,
        "active_device": device_info
    }

@app.post("/api/bluetooth/reconnect")
async def trigger_bluetooth_reconnect(payload: Optional[BluetoothReconnectRequest] = None):
    """
    Triggers remote reconnection to the office Bluetooth speaker without physical access to the server.
    """
    mac = payload.mac if payload else None
    result = await reconnect_bluetooth_speaker(target_mac=mac)
    return result

# ----------------- Admin Authentication -----------------

@app.post("/api/auth/login")
async def admin_login(payload: LoginRequest):
    if not authenticate_admin(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    token = create_access_token(payload.username)
    return {"token": token, "username": payload.username, "token_type": "bearer"}

@app.get("/api/admin/verify")
async def admin_verify(admin: dict = Depends(require_admin)):
    return {"authenticated": True, "user": admin.get("sub")}

# ----------------- Admin Settings & Volume -----------------

@app.get("/api/admin/settings")
async def admin_get_settings(admin: dict = Depends(require_admin)):
    settings = load_settings()
    current_vol = audio_engine.get_volume_sync()
    return {"settings": settings.model_dump(), "current_system_volume": current_vol}

@app.post("/api/admin/settings")
async def admin_update_settings(new_settings: SettingsModel, admin: dict = Depends(require_admin)):
    save_settings(new_settings)
    await audio_engine.set_volume(new_settings.server_volume)
    await audio_engine.broadcast_state()
    return {"success": True, "settings": new_settings.model_dump()}

@app.post("/api/admin/volume")
async def admin_set_volume(payload: VolumeRequest, admin: dict = Depends(require_admin)):
    vol = await audio_engine.set_volume(payload.volume)
    return {"success": True, "volume": vol}

# ----------------- Admin Categories CRUD -----------------

@app.get("/api/admin/categories")
async def admin_list_categories(admin: dict = Depends(require_admin)):
    categories = load_categories()
    if not any(c.id == "uncategorized" for c in categories):
        categories.append(CategoryModel(
            id="uncategorized",
            name_ar="Uncategorized",
            name_en="Uncategorized",
            icon="Folder",
            color="cyan",
            order=99
        ))
    return sorted(categories, key=lambda c: c.order or 0)

@app.post("/api/admin/categories")
async def admin_create_category(category: CategoryModel, admin: dict = Depends(require_admin)):
    categories = load_categories()
    if any(c.id == category.id for c in categories):
        raise HTTPException(status_code=400, detail="Category ID already exists")
    categories.append(category)
    save_categories(categories)
    return {"success": True, "category": category}

@app.put("/api/admin/categories/{cat_id}")
async def admin_update_category(cat_id: str, updated: CategoryModel, admin: dict = Depends(require_admin)):
    categories = load_categories()
    idx = next((i for i, c in enumerate(categories) if c.id == cat_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Category not found")
    categories[idx] = updated
    save_categories(categories)
    return {"success": True, "category": updated}

@app.delete("/api/admin/categories/{cat_id}")
async def admin_delete_category(cat_id: str, admin: dict = Depends(require_admin)):
    categories = load_categories()
    filtered = [c for c in categories if c.id != cat_id]
    if len(filtered) == len(categories):
        raise HTTPException(status_code=404, detail="Category not found")
    save_categories(filtered)
    return {"success": True, "deleted_id": cat_id}

# ----------------- Admin Presets CRUD -----------------

@app.get("/api/admin/presets")
async def admin_list_presets(admin: dict = Depends(require_admin)):
    presets = load_presets()
    res = []
    for p in presets:
        audio_cached_ar = (PRESETS_DIR / f"{p.id}_ar.mp3").exists() or (PRESETS_DIR / f"{p.id}.mp3").exists()
        audio_cached_en = (PRESETS_DIR / f"{p.id}_en.mp3").exists()
        res.append({
            **p.model_dump(),
            "cached": audio_cached_ar or audio_cached_en,
            "cached_ar": audio_cached_ar,
            "cached_en": audio_cached_en
        })
    return res

@app.post("/api/admin/presets")
async def admin_create_preset(preset: PresetModel, admin: dict = Depends(require_admin)):
    presets = load_presets()
    if any(p.id == preset.id for p in presets):
        raise HTTPException(status_code=400, detail="Preset ID already exists")

    # Unified single title and single text
    title = preset.title or preset.title_ar or preset.title_en or preset.id
    text = preset.text or preset.text_ar or preset.text_en or ""

    preset.title = title
    preset.title_ar = title
    preset.title_en = title
    preset.text = text
    preset.text_ar = text
    preset.text_en = text

    if not preset.category_id or preset.category_id == "uncategorized":
        preset.category_id = "uncategorized"
        preset.category = "Uncategorized"

    presets.append(preset)
    save_presets(presets)

    # Detect language and cache accordingly (Arabic engine if Arabic, English engine if English)
    detected_lang = detect_language(text)
    asyncio.create_task(audio_engine.ensure_preset_cached(preset.id, text, detected_lang))

    return {"success": True, "preset": preset}

@app.put("/api/admin/presets/{preset_id}")
async def admin_update_preset(preset_id: str, updated: PresetModel, admin: dict = Depends(require_admin)):
    presets = load_presets()
    idx = next((i for i, p in enumerate(presets) if p.id == preset_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Preset not found")

    title = updated.title or updated.title_ar or updated.title_en or preset_id
    text = updated.text or updated.text_ar or updated.text_en or ""

    updated.title = title
    updated.title_ar = title
    updated.title_en = title
    updated.text = text
    updated.text_ar = text
    updated.text_en = text

    if not updated.category_id or updated.category_id == "uncategorized":
        updated.category_id = "uncategorized"
        updated.category = "Uncategorized"

    presets[idx] = updated
    save_presets(presets)

    # Re-cache with detected language
    detected_lang = detect_language(text)
    asyncio.create_task(audio_engine.generate_tts(text, PRESETS_DIR / f"{updated.id}_{detected_lang}.mp3"))

    return {"success": True, "preset": updated}

@app.delete("/api/admin/presets/{preset_id}")
async def admin_delete_preset(preset_id: str, admin: dict = Depends(require_admin)):
    presets = load_presets()
    filtered = [p for p in presets if p.id != preset_id]
    if len(filtered) == len(presets):
        raise HTTPException(status_code=404, detail="Preset not found")
    save_presets(filtered)

    for suffix in ["", "_ar", "_en"]:
        target = PRESETS_DIR / f"{preset_id}{suffix}.mp3"
        if target.exists():
            try:
                target.unlink()
            except Exception:
                pass
    return {"success": True, "deleted_id": preset_id}

@app.post("/api/admin/presets/{preset_id}/rebuild-cache")
async def admin_rebuild_preset_cache(preset_id: str, admin: dict = Depends(require_admin)):
    presets = load_presets()
    preset = next((p for p in presets if p.id == preset_id), None)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    text = preset.text or preset.text_ar or preset.text_en or ""
    detected_lang = detect_language(text)
    await audio_engine.generate_tts(text, PRESETS_DIR / f"{preset.id}_{detected_lang}.mp3")
    return {"success": True, "message": f"Cache rebuilt for {preset.title or preset.id}"}

@app.post("/api/admin/presets/rebuild-all-cache")
async def admin_rebuild_all_cache(admin: dict = Depends(require_admin)):
    presets = load_presets()
    for p in presets:
        try:
            text = p.text or p.text_ar or p.text_en or ""
            if text:
                detected_lang = detect_language(text)
                await audio_engine.generate_tts(text, PRESETS_DIR / f"{p.id}_{detected_lang}.mp3")
        except Exception as e:
            print(f"Error rebuilding cache for {p.id}: {e}")
    return {"success": True, "message": "All audio caches rebuilt successfully"}

# ----------------- Admin Live Voice Broadcasting (Zero Retention) -----------------

@app.post("/api/admin/broadcast-voice")
async def admin_broadcast_voice(
    file: UploadFile = File(...),
    request: Request = None,
    admin: dict = Depends(require_admin)
):
    """
    Receives live voice recording from Admin device, broadcasts it directly to speaker,
    and immediately deletes the file from disk with zero retention.
    """
    client_ip = request.client.host if request and request.client else "Admin"
    suffix = Path(file.filename or "voice.webm").suffix or ".webm"
    temp_file = TEMP_DIR / f"voice_{uuid.uuid4().hex}{suffix}"

    with open(temp_file, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    # Broadcast to speaker and immediately delete file
    res = await audio_engine.broadcast_voice_recording(temp_file, sender_ip=client_ip)
    return {
        "success": True,
        "message": "Live voice announcement broadcasted to speaker and securely deleted",
        "result": res
    }

# ----------------- Admin Audit Log -----------------

@app.get("/api/admin/audit")
async def admin_get_audit(admin: dict = Depends(require_admin)):
    audit = load_audit()
    total_calls = len(audit)
    last_50 = list(reversed(audit))[:50]

    sources_count = {}
    for entry in audit:
        s = entry.get("source", "unknown")
        sources_count[s] = sources_count.get(s, 0) + 1

    return {
        "total_announcements": total_calls,
        "sources_breakdown": sources_count,
        "recent_entries": last_50
    }

@app.delete("/api/admin/audit/{entry_id}")
async def admin_delete_audit_entry(entry_id: str, admin: dict = Depends(require_admin)):
    audit = load_audit()
    filtered = [e for e in audit if e.get("id") != entry_id]
    if len(filtered) == len(audit):
        raise HTTPException(status_code=404, detail="Audit entry not found")
    save_audit(filtered)
    return {"success": True, "deleted_id": entry_id}

@app.delete("/api/admin/audit")
async def admin_clear_audit(admin: dict = Depends(require_admin)):
    save_audit([])
    return {"success": True, "message": "All audit records cleared successfully"}

# ----------------- Admin Testing Tools -----------------

@app.post("/api/admin/test-chime")
async def admin_test_chime(payload: TestChimeRequest, admin: dict = Depends(require_admin)):
    tone_file = CHIMES_DIR / f"{payload.tone}.mp3"
    if not tone_file.exists():
        raise HTTPException(status_code=404, detail="Chime file not found")
    settings = load_settings()
    chime_vol = getattr(settings, 'chime_volume', 80)
    asyncio.create_task(audio_engine.play_audio_file(tone_file, volume=chime_vol))
    return {"success": True, "message": f"Playing {payload.tone} chime at {chime_vol}% volume"}

@app.post("/api/admin/test-voice")
async def admin_test_voice(payload: TestVoiceRequest, admin: dict = Depends(require_admin)):
    lang = payload.lang or ("ar" if payload.voice.startswith("ar-") else "en")
    sample_text = payload.text
    if not sample_text:
        if lang == "ar":
            sample_text = "\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0643\u0645\u060c \u0647\u0630\u0627 \u0627\u062e\u062a\u0628\u0627\u0631 \u0645\u0628\u0627\u0634\u0631 \u0644\u062c\u0648\u062f\u0629 \u0648\u0646\u0628\u0631\u0629 \u0627\u0644\u0635\u0648\u062a \u0627\u0644\u0645\u062e\u062a\u0627\u0631 \u0641\u064a \u0646\u0638\u0627\u0645 \u0643\u064a\u0631\u0646\u0627\u0644 \u0628\u064a\u0646\u063a."
        else:
            sample_text = "Hello, this is a live audio test for the selected voice model in Kernel Ping."

    test_file = TEMP_DIR / f"test_{uuid.uuid4().hex[:8]}.mp3"
    try:
        await audio_engine.generate_tts(sample_text, test_file, voice=payload.voice)
        if test_file.exists():
            asyncio.create_task(audio_engine.play_audio_file(test_file))
        return {"success": True, "message": f"Voice test triggered for {payload.voice}", "voice": payload.voice}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation error: {str(e)}")

@app.post("/api/admin/test-voice-recording")
async def admin_test_voice_recording(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    """Tests admin voice recording playback on speaker before final broadcast, then deletes it."""
    ext = "webm"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1]
    filename = f"test_voice_{uuid.uuid4().hex[:8]}.{ext}"
    temp_path = TEMP_DIR / filename
    try:
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        return await audio_engine.test_voice_recording_on_speaker(temp_path)
    except Exception as e:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Voice test error: {str(e)}")

# ----------------- Static SPA Support for Production / Debian 13 -----------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = BASE_DIR / "frontend" / "dist"
if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

@app.get("/{full_path:path}")
async def serve_spa_frontend(full_path: str):
    if full_path.startswith("api") or full_path.startswith("ws"):
        raise HTTPException(status_code=404, detail="Not Found")
    file_path = frontend_dist / full_path
    if file_path.is_file():
        return FileResponse(file_path)
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Kernel Ping Backend API Running."}
