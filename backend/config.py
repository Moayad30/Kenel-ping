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
CATEGORIES_FILE = STORAGE_DIR / "categories.json"
AUDIT_FILE = STORAGE_DIR / "audit.json"

JWT_SECRET = os.getenv("KERNELPING_JWT_SECRET", "kernelping_stealth_secret_2026_xyz_7721")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72

ADMIN_USERNAME = os.getenv("KERNELPING_ADMIN_USER", "admin")
ADMIN_PASSWORD_HASH = os.getenv("KERNELPING_ADMIN_PASS", "kernel2026")

for d in [STORAGE_DIR, PRESETS_DIR, CHIMES_DIR, TEMP_DIR]:
    d.mkdir(parents=True, exist_ok=True)

class SettingsModel(BaseModel):
    spam_cooldown_enabled: bool = True
    cooldown_seconds: int = Field(default=15, ge=1, le=120)
    pre_chime_enabled: bool = True
    chime_tone: str = "airport" # airport, bell, alert
    bluetooth_wakeup_enabled: bool = True
    server_volume: int = Field(default=85, ge=0, le=100)
    tts_voice_ar: str = "ar-SY-LaithNeural"
    tts_voice_en: str = "en-US-AriaNeural"
    speech_rate: str = "+0%"
    speech_pitch: str = "+0Hz"
    smart_pronunciation_enabled: bool = True

    # Legacy support
    @property
    def tts_voice(self) -> str:
        return self.tts_voice_ar

class CategoryModel(BaseModel):
    id: str
    name_ar: str
    name_en: str
    icon: Optional[str] = "Folder"
    color: Optional[str] = "cyan"
    order: Optional[int] = 0

class PresetModel(BaseModel):
    id: str
    category_id: Optional[str] = None
    category: Optional[str] = None
    title: Optional[str] = None
    title_ar: Optional[str] = None
    title_en: Optional[str] = None
    text: Optional[str] = None
    text_ar: Optional[str] = None
    text_en: Optional[str] = None
    icon: Optional[str] = "Volume2"
    color: Optional[str] = "cyan"

class AuditEntry(BaseModel):
    id: str
    timestamp: str
    text: str
    title: Optional[str] = None
    source: str # "preset" | "free_text" | "device_call"
    sender_ip: Optional[str] = None
    language: Optional[str] = "ar"

def load_settings() -> SettingsModel:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Map old tts_voice if needed
                if "tts_voice" in data and "tts_voice_ar" not in data:
                    data["tts_voice_ar"] = data["tts_voice"]
                return SettingsModel(**data)
        except Exception:
            pass
    settings = SettingsModel()
    save_settings(settings)
    return settings

def save_settings(settings: SettingsModel):
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings.model_dump(), f, ensure_ascii=False, indent=2)

def load_categories() -> List[CategoryModel]:
    if CATEGORIES_FILE.exists():
        try:
            with open(CATEGORIES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [CategoryModel(**item) for item in data]
        except Exception:
            pass
    return []

def save_categories(categories: List[CategoryModel]):
    with open(CATEGORIES_FILE, "w", encoding="utf-8") as f:
        json.dump([c.model_dump() for c in categories], f, ensure_ascii=False, indent=2)

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
