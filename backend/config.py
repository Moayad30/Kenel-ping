import os
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional

BASE_DIR = Path("/home/moayad/kernelping")
STORAGE_DIR = BASE_DIR / "storage"
PRESETS_DIR = STORAGE_DIR / "presets"
CHIMES_DIR = STORAGE_DIR / "chimes"
TEMP_DIR = STORAGE_DIR / "temp"

SETTINGS_FILE = STORAGE_DIR / "settings.json"
PRESETS_FILE = STORAGE_DIR / "presets.json"
AUDIT_FILE = STORAGE_DIR / "audit.json"

JWT_SECRET = os.getenv("KERNELPING_JWT_SECRET", "kernelping_stealth_secret_2026_xyz_7721")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72

ADMIN_USERNAME = os.getenv("KERNELPING_ADMIN_USER", "admin")
ADMIN_PASSWORD_HASH = os.getenv("KERNELPING_ADMIN_PASS", "kernel2026") # Can check raw or bcrypt

for d in [STORAGE_DIR, PRESETS_DIR, CHIMES_DIR, TEMP_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class SettingsModel(BaseModel):
    spam_cooldown_enabled: bool = True
    cooldown_seconds: int = Field(default=15, ge=1, le=120)
    pre_chime_enabled: bool = True
    chime_tone: str = "airport" # airport, bell, alert
    bluetooth_wakeup_enabled: bool = True
    server_volume: int = Field(default=85, ge=0, le=100)
    tts_voice: str = "ar-SY-LaithNeural"

class PresetModel(BaseModel):
    id: str
    category: str
    title: str
    text: str
    icon: Optional[str] = "Volume2"
    color: Optional[str] = "cyan"

class AuditEntry(BaseModel):
    id: str
    timestamp: str
    text: str
    title: Optional[str] = None
    source: str # "preset" | "free_text" | "device_call"
    sender_ip: Optional[str] = None

def load_settings() -> SettingsModel:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return SettingsModel(**json.load(f))
        except Exception:
            pass
    settings = SettingsModel()
    save_settings(settings)
    return settings

def save_settings(settings: SettingsModel):
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings.model_dump(), f, ensure_ascii=False, indent=2)

def load_presets() -> List[PresetModel]:
    if PRESETS_FILE.exists():
        try:
            with open(PRESETS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [PresetModel(**item) for item in data]
        except Exception:
            pass
    return []

def save_presets(presets: List[PresetModel]):
    with open(PRESETS_FILE, "w", encoding="utf-8") as f:
        json.dump([p.model_dump() for p in presets], f, ensure_ascii=False, indent=2)

def load_audit() -> List[dict]:
    if AUDIT_FILE.exists():
        try:
            with open(AUDIT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_audit(audit_entries: List[dict]):
    with open(AUDIT_FILE, "w", encoding="utf-8") as f:
        json.dump(audit_entries[-100:], f, ensure_ascii=False, indent=2)

