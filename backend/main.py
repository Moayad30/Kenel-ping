import os
import asyncio
from typing import Optional, List
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import (
    load_settings, save_settings, SettingsModel,
    load_presets, save_presets, PresetModel,
    load_audit, save_audit, PRESETS_DIR, CHIMES_DIR
)
from backend.auth import authenticate_admin, create_access_token, require_admin
from backend.audio_engine import audio_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: start queue worker
    audio_engine.start()
    yield
    # Shutdown

app = FastAPI(title="Kernel Ping API", version="1.0.0", lifespan=lifespan)

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

class SpeakPresetRequest(BaseModel):
    pass

class SpeakCustomRequest(BaseModel):
    text: str
    title: Optional[str] = None

class SpeakCallRequest(BaseModel):
    target: str
    message: Optional[str] = None

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
            # Keep-alive ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        audio_engine.disconnect_ws(websocket)
    except Exception:
        audio_engine.disconnect_ws(websocket)

# ----------------- Public Endpoints (Member Workspace) -----------------

@app.get("/api/status")
async def get_status():
    return audio_engine.get_state_dict()

@app.get("/api/presets")
async def get_public_presets():
    presets = load_presets()
    return presets

@app.post("/api/speak/preset/{preset_id}")
async def speak_preset(preset_id: str, request: Request):
    can_proceed, remaining = audio_engine.check_cooldown()
    if not can_proceed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"يرجى الانتظار {remaining} ثانية قبل إرسال نداء جديد لمنع الإزعاج"
        )
    
    presets = load_presets()
    preset = next((p for p in presets if p.id == preset_id), None)
    if not preset:
        raise HTTPException(status_code=404, detail="الجملة المحددة غير موجودة")

    client_ip = request.client.host if request.client else "Local"
    item = await audio_engine.enqueue(
        title=preset.title,
        text=preset.text,
        source="preset",
        preset_id=preset.id,
        sender_ip=client_ip
    )
    return {"success": True, "message": "تمت إضافة النداء إلى الطابور بنجاح", "item": item}

@app.post("/api/speak/custom")
async def speak_custom(payload: SpeakCustomRequest, request: Request):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="لا يمكن ترك نص النطق فارغاً")
    if len(text) > 300:
        raise HTTPException(status_code=400, detail="الحد الأقصى للنص هو 300 حرف")

    can_proceed, remaining = audio_engine.check_cooldown()
    if not can_proceed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"يرجى الانتظار {remaining} ثانية قبل إرسال نداء جديد لمنع الإزعاج"
        )

    client_ip = request.client.host if request.client else "Local"
    item = await audio_engine.enqueue(
        title=payload.title or "نداء حر",
        text=text,
        source="free_text",
        sender_ip=client_ip
    )
    return {"success": True, "message": "تمت إضافة النص الحر إلى الطابور بنجاح", "item": item}

@app.post("/api/speak/call")
async def speak_device_or_person(payload: SpeakCallRequest, request: Request):
    target = payload.target.strip()
    if not target:
        raise HTTPException(status_code=400, detail="يرجى تحديد اسم الشخص أو القسم أو الجهاز المستدعى")

    can_proceed, remaining = audio_engine.check_cooldown()
    if not can_proceed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"يرجى الانتظار {remaining} ثانية قبل إرسال نداء جديد لمنع الإزعاج"
        )

    msg = payload.message.strip() if payload.message else ""
    if msg:
        full_text = f"نداء عاجل إلى {target}، {msg}"
    else:
        full_text = f"نداء موجه إلى {target}، يرجى التوجه إلى نقطة التنسيق أو المكاتب فوراً."

    client_ip = request.client.host if request.client else "Local"
    item = await audio_engine.enqueue(
        title=f"استدعاء: {target}",
        text=full_text,
        source="device_call",
        sender_ip=client_ip
    )
    return {"success": True, "message": "تم إطلاق الاستدعاء في الطابور", "item": item}

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

# ----------------- Stealth Admin Controls -----------------

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

@app.get("/api/admin/presets")
async def admin_list_presets(admin: dict = Depends(require_admin)):
    presets = load_presets()
    res = []
    for p in presets:
        audio_cached = (PRESETS_DIR / f"{p.id}.mp3").exists()
        res.append({**p.model_dump(), "cached": audio_cached})
    return res

@app.post("/api/admin/presets")
async def admin_create_preset(preset: PresetModel, admin: dict = Depends(require_admin)):
    presets = load_presets()
    if any(p.id == preset.id for p in presets):
        raise HTTPException(status_code=400, detail="المعرف التعريفي للجملة موجود مسبقاً")
    presets.append(preset)
    save_presets(presets)
    
    # Asynchronously trigger cache generation
    asyncio.create_task(audio_engine.ensure_preset_cached(preset.id, preset.text))
    return {"success": True, "preset": preset}

@app.put("/api/admin/presets/{preset_id}")
async def admin_update_preset(preset_id: str, updated: PresetModel, admin: dict = Depends(require_admin)):
    presets = load_presets()
    idx = next((i for i, p in enumerate(presets) if p.id == preset_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="الجملة غير موجودة")
    
    presets[idx] = updated
    save_presets(presets)
    
    # Re-cache
    asyncio.create_task(audio_engine.generate_tts(updated.text, PRESETS_DIR / f"{updated.id}.mp3"))
    return {"success": True, "preset": updated}

@app.delete("/api/admin/presets/{preset_id}")
async def admin_delete_preset(preset_id: str, admin: dict = Depends(require_admin)):
    presets = load_presets()
    filtered = [p for p in presets if p.id != preset_id]
    if len(filtered) == len(presets):
        raise HTTPException(status_code=404, detail="الجملة غير موجودة")
    save_presets(filtered)

    # Delete cached audio if exists
    target = PRESETS_DIR / f"{preset_id}.mp3"
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
        raise HTTPException(status_code=404, detail="الجملة غير موجودة")
    
    await audio_engine.generate_tts(preset.text, PRESETS_DIR / f"{preset.id}.mp3")
    return {"success": True, "message": f"تمت إعادة بناء التخزين الصوتي لـ {preset.title}"}

@app.post("/api/admin/presets/rebuild-all-cache")
async def admin_rebuild_all_cache(admin: dict = Depends(require_admin)):
    presets = load_presets()
    for p in presets:
        try:
            await audio_engine.generate_tts(p.text, PRESETS_DIR / f"{p.id}.mp3")
        except Exception as e:
            print(f"Error rebuilding cache for {p.id}: {e}")
    return {"success": True, "message": "تم تحديث كافة الملفات الصوتية بنجاح"}

@app.get("/api/admin/audit")
async def admin_get_audit(admin: dict = Depends(require_admin)):
    audit = load_audit()
    total_calls = len(audit)
    last_20 = list(reversed(audit))[:20]
    
    # stats by source
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
        raise HTTPException(status_code=404, detail="ملف النغمة غير موجود")
    asyncio.create_task(audio_engine.play_audio_file(tone_file))
    return {"success": True, "message": f"جاري اختبار نغمة {payload.tone}"}

# ----------------- Static SPA Support for Production / Debian 13 -----------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.config import BASE_DIR

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
    return {"message": "Kernel Ping Backend API Running. Build frontend to view UI."}

