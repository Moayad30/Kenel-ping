import os
import asyncio
from typing import Optional, List
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import (
    load_settings, save_settings, SettingsModel,
    load_presets, save_presets, PresetModel,
    load_categories, save_categories, CategoryModel,
    load_audit, save_audit, PRESETS_DIR, CHIMES_DIR, BASE_DIR
)
from backend.auth import authenticate_admin, create_access_token, require_admin
from backend.audio_engine import audio_engine, detect_language

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: start queue worker
    audio_engine.start()
    yield

app = FastAPI(title="Kernel Ping API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Models -----------------

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
    tone: str # airport | bell | alert

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
    return audio_engine.get_state_dict()

@app.get("/api/categories")
async def get_public_categories():
    categories = load_categories()
    return sorted(categories, key=lambda c: c.order or 0)

@app.get("/api/presets")
async def get_public_presets():
    presets = load_presets()
    return presets

@app.post("/api/speak/preset/{preset_id}")
async def speak_preset(preset_id: str, request: Request, lang: Optional[str] = Query(default="ar")):
    can_proceed, remaining = audio_engine.check_cooldown()
    if not can_proceed:
        msg = f"يرجى الانتظار {remaining} ثانية قبل إرسال نداء جديد لمنع الإزعاج" if lang == "ar" else f"Please wait {remaining}s before sending another announcement"
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=msg)
    
    presets = load_presets()
    preset = next((p for p in presets if p.id == preset_id), None)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found" if lang == "en" else "الجملة غير موجودة")

    # Select bilingual text
    if lang == "en" and preset.text_en:
        speech_text = preset.text_en
        speech_title = preset.title_en or preset.title or preset.id
    else:
        speech_text = preset.text_ar or preset.text or ""
        speech_title = preset.title_ar or preset.title or preset.id

    client_ip = request.client.host if request.client else "Local"
    item = await audio_engine.enqueue(
        title=speech_title,
        text=speech_text,
        source="preset",
        preset_id=preset.id,
        sender_ip=client_ip,
        lang=lang
    )
    return {"success": True, "message": "Queued successfully" if lang == "en" else "تمت إضافة النداء إلى الطابور بنجاح", "item": item}

@app.post("/api/speak/custom")
async def speak_custom(payload: SpeakCustomRequest, request: Request):
    text = payload.text.strip()
    lang = payload.lang or detect_language(text)

    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty" if lang == "en" else "لا يمكن ترك نص النطق فارغاً")
    if len(text) > 400:
        raise HTTPException(status_code=400, detail="Text exceeds 400 characters" if lang == "en" else "الحد الأقصى للنص هو 400 حرف")

    can_proceed, remaining = audio_engine.check_cooldown()
    if not can_proceed:
        msg = f"يرجى الانتظار {remaining} ثانية قبل إرسال نداء جديد لمنع الإزعاج" if lang == "ar" else f"Please wait {remaining}s before sending another announcement"
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=msg)

    client_ip = request.client.host if request.client else "Local"
    title = payload.title or ("Free Announcement" if lang == "en" else "نداء حر")
    item = await audio_engine.enqueue(
        title=title,
        text=text,
        source="free_text",
        sender_ip=client_ip,
        lang=lang
    )
    return {"success": True, "message": "Queued" if lang == "en" else "تمت إضافة النص الحر إلى الطابور بنجاح", "item": item}

@app.post("/api/speak/call")
async def speak_device_or_person(payload: SpeakCallRequest, request: Request):
    target = payload.target.strip()
    lang = payload.lang or detect_language(target + (payload.message or ""))

    if not target:
        raise HTTPException(status_code=400, detail="Target name required" if lang == "en" else "يرجى تحديد اسم الشخص أو القسم أو الجهاز المستدعى")

    can_proceed, remaining = audio_engine.check_cooldown()
    if not can_proceed:
        msg = f"يرجى الانتظار {remaining} ثانية قبل إرسال نداء جديد لمنع الإزعاج" if lang == "ar" else f"Please wait {remaining}s before calling"
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=msg)

    msg = payload.message.strip() if payload.message else ""
    if lang == "en":
        if msg:
            full_text = f"Urgent call for {target}. {msg}"
        else:
            full_text = f"Urgent call for {target}. Please report to the meeting room immediately."
        title = f"Call: {target}"
    else:
        if msg:
            full_text = f"نداء عاجل إلى {target}، {msg}"
        else:
            full_text = f"نداء موجه إلى {target}، يرجى التوجه إلى قاعة التنسيق أو المكاتب فوراً."
        title = f"استدعاء: {target}"

    client_ip = request.client.host if request.client else "Local"
    item = await audio_engine.enqueue(
        title=title,
        text=full_text,
        source="device_call",
        sender_ip=client_ip,
        lang=lang
    )
    return {"success": True, "message": "Call initiated" if lang == "en" else "تم إطلاق الاستدعاء في الطابور", "item": item}

# ----------------- Stealth Admin Authentication -----------------

@app.post("/api/auth/login")
async def admin_login(payload: LoginRequest):
    if not authenticate_admin(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة"
        )
    token = create_access_token(payload.username)
    return {"token": token, "username": payload.username, "token_type": "bearer"}

@app.get("/api/admin/verify")
async def admin_verify(admin: dict = Depends(require_admin)):
    return {"authenticated": True, "user": admin.get("sub")}

# ----------------- Stealth Admin Settings & Volume -----------------

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

# ----------------- Stealth Admin Categories CRUD -----------------

@app.get("/api/admin/categories")
async def admin_list_categories(admin: dict = Depends(require_admin)):
    categories = load_categories()
    return sorted(categories, key=lambda c: c.order or 0)

@app.post("/api/admin/categories")
async def admin_create_category(category: CategoryModel, admin: dict = Depends(require_admin)):
    categories = load_categories()
    if any(c.id == category.id for c in categories):
        raise HTTPException(status_code=400, detail="Category ID already exists / معرف التصنيف موجود مسبقاً")
    categories.append(category)
    save_categories(categories)
    return {"success": True, "category": category}

@app.put("/api/admin/categories/{cat_id}")
async def admin_update_category(cat_id: str, updated: CategoryModel, admin: dict = Depends(require_admin)):
    categories = load_categories()
    idx = next((i for i, c in enumerate(categories) if c.id == cat_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Category not found / التصنيف غير موجود")
    categories[idx] = updated
    save_categories(categories)
    return {"success": True, "category": updated}

@app.delete("/api/admin/categories/{cat_id}")
async def admin_delete_category(cat_id: str, admin: dict = Depends(require_admin)):
    categories = load_categories()
    filtered = [c for c in categories if c.id != cat_id]
    if len(filtered) == len(categories):
        raise HTTPException(status_code=404, detail="Category not found / التصنيف غير موجود")
    save_categories(filtered)
    return {"success": True, "deleted_id": cat_id}

# ----------------- Stealth Admin Presets CRUD -----------------

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
        raise HTTPException(status_code=400, detail="Preset ID already exists / المعرف موجود مسبقاً")
    
    # Normalize fields
    if not preset.title_ar and preset.title:
        preset.title_ar = preset.title
    if not preset.text_ar and preset.text:
        preset.text_ar = preset.text

    presets.append(preset)
    save_presets(presets)
    
    # Asynchronously trigger cache generation
    if preset.text_ar:
        asyncio.create_task(audio_engine.ensure_preset_cached(preset.id, preset.text_ar, "ar"))
    if preset.text_en:
        asyncio.create_task(audio_engine.ensure_preset_cached(preset.id, preset.text_en, "en"))

    return {"success": True, "preset": preset}

@app.put("/api/admin/presets/{preset_id}")
async def admin_update_preset(preset_id: str, updated: PresetModel, admin: dict = Depends(require_admin)):
    presets = load_presets()
    idx = next((i for i, p in enumerate(presets) if p.id == preset_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Preset not found / الجملة غير موجودة")
    
    if not updated.title_ar and updated.title:
        updated.title_ar = updated.title
    if not updated.text_ar and updated.text:
        updated.text_ar = updated.text

    presets[idx] = updated
    save_presets(presets)
    
    # Re-cache both
    if updated.text_ar:
        asyncio.create_task(audio_engine.generate_tts(updated.text_ar, PRESETS_DIR / f"{updated.id}_ar.mp3"))
    if updated.text_en:
        asyncio.create_task(audio_engine.generate_tts(updated.text_en, PRESETS_DIR / f"{updated.id}_en.mp3"))

    return {"success": True, "preset": updated}

@app.delete("/api/admin/presets/{preset_id}")
async def admin_delete_preset(preset_id: str, admin: dict = Depends(require_admin)):
    presets = load_presets()
    filtered = [p for p in presets if p.id != preset_id]
    if len(filtered) == len(presets):
        raise HTTPException(status_code=404, detail="Preset not found / الجملة غير موجودة")
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
    
    if preset.text_ar or preset.text:
        await audio_engine.generate_tts(preset.text_ar or preset.text, PRESETS_DIR / f"{preset.id}_ar.mp3")
    if preset.text_en:
        await audio_engine.generate_tts(preset.text_en, PRESETS_DIR / f"{preset.id}_en.mp3")
    return {"success": True, "message": f"Cache rebuilt for {preset.title or preset.id}"}

@app.post("/api/admin/presets/rebuild-all-cache")
async def admin_rebuild_all_cache(admin: dict = Depends(require_admin)):
    presets = load_presets()
    for p in presets:
        try:
            if p.text_ar or p.text:
                await audio_engine.generate_tts(p.text_ar or p.text, PRESETS_DIR / f"{p.id}_ar.mp3")
            if p.text_en:
                await audio_engine.generate_tts(p.text_en, PRESETS_DIR / f"{p.id}_en.mp3")
        except Exception as e:
            print(f"Error rebuilding cache for {p.id}: {e}")
    return {"success": True, "message": "All audio caches rebuilt successfully"}

@app.get("/api/admin/audit")
async def admin_get_audit(admin: dict = Depends(require_admin)):
    audit = load_audit()
    total_calls = len(audit)
    last_20 = list(reversed(audit))[:20]
    
    sources_count = {}
    for entry in audit:
        s = entry.get("source", "unknown")
        sources_count[s] = sources_count.get(s, 0) + 1
        
    return {
        "total_announcements": total_calls,
        "sources_breakdown": sources_count,
        "recent_entries": last_20
    }

@app.post("/api/admin/test-chime")
async def admin_test_chime(payload: TestChimeRequest, admin: dict = Depends(require_admin)):
    tone_file = CHIMES_DIR / f"{payload.tone}.mp3"
    if not tone_file.exists():
        raise HTTPException(status_code=404, detail="Chime file not found")
    asyncio.create_task(audio_engine.play_audio_file(tone_file))
    return {"success": True, "message": f"Playing {payload.tone} chime"}

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
