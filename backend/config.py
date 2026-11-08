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
ROUTINES_FILE = STORAGE_DIR / "routines.json"
SNIPPETS_FILE = STORAGE_DIR / "snippets.json"

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
    chime_tone: str = "airport"  # airport, bell, alert
    chime_volume: int = Field(default=80, ge=0, le=100)
    bluetooth_wakeup_enabled: bool = True
    server_volume: int = Field(default=85, ge=0, le=100)
    bluetooth_speaker_mac: Optional[str] = None
    bluetooth_speaker_name: Optional[str] = None
    tts_voice_ar: str = "ar-SA-HamedNeural"
    tts_voice_en: str = "en-US-AndrewMultilingualNeural"
    speech_rate: str = "+0%"
    speech_pitch: str = "+0Hz"
    smart_pronunciation_enabled: bool = False

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
    category_id: Optional[str] = "uncategorized"
    category: Optional[str] = "Uncategorized"
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
    source: str  # "preset" | "free_text" | "device_call" | "admin_voice" | "routine"
    sender_ip: Optional[str] = None
    language: Optional[str] = "ar"

class RoutineModel(BaseModel):
    id: str
    title: Optional[str] = None
    template: str  # e.g. "Where is device #{num}?" with placeholder {num}
    default_value: Optional[str] = "1"
    icon: Optional[str] = "Cpu"  # Cpu, CheckCircle2, Clock, Search, Laptop, AlertCircle
    color: Optional[str] = "cyan"  # cyan, emerald, amber, rose, blue, purple
    order: Optional[int] = 0

class SnippetModel(BaseModel):
    id: str
    text: str  # e.g. "Where is device #"
    icon: Optional[str] = "Tag"
    order: Optional[int] = 0

def load_settings() -> SettingsModel:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "tts_voice" in data and "tts_voice_ar" not in data:
                    data["tts_voice_ar"] = data["tts_voice"]
                if "chime_volume" not in data:
                    data["chime_volume"] = 80
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

def load_routines() -> List[RoutineModel]:
    if ROUTINES_FILE.exists():
        try:
            with open(ROUTINES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [RoutineModel(**item) for item in data]
        except Exception:
            pass
    # Default built-in routines
    default_routines = [
        RoutineModel(
            id="routine_locate_device",
            title="Locate Device / \u0645\u0643\u0627\u0646 \u062c\u0647\u0627\u0632",
            template="\u0623\u064a\u0646 \u0647\u0648 \u062c\u0647\u0627\u0632 \u0631\u0642\u0645 {num}\u061f",
            default_value="1",
            icon="Search",
            color="cyan",
            order=1
        ),
        RoutineModel(
            id="routine_completed_count",
            title="Completed Devices / \u0625\u0646\u062c\u0627\u0632 \u0623\u062c\u0647\u0632\u0629",
            template="\u062a\u0645 \u0625\u0646\u062c\u0627\u0632 {num} \u062c\u0647\u0627\u0632 \u0625\u0644\u0649 \u0627\u0644\u0622\u0646.",
            default_value="70",
            icon="CheckCircle2",
            color="emerald",
            order=2
        ),
        RoutineModel(
            id="routine_pending_count",
            title="Pending Devices / \u0623\u062c\u0647\u0632\u0629 \u0645\u062a\u0628\u0642\u064a\u0629",
            template="\u064a\u0648\u062c\u062f {num} \u0623\u062c\u0647\u0632\u0629 \u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0628\u062f\u0621 \u0628\u0647\u0627 \u0628\u0639\u062f.",
            default_value="10",
            icon="Clock",
            color="amber",
            order=3
        ),
        RoutineModel(
            id="routine_deliver_device",
            title="Deliver Device / \u062a\u0633\u0644\u064a\u0645 \u062c\u0647\u0627\u0632",
            template="\u064a\u0631\u062c\u0649 \u062a\u0633\u0644\u064a\u0645 \u062c\u0647\u0627\u0632 \u0631\u0642\u0645 {num} \u0644\u0642\u0633\u0645 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645.",
            default_value="5",
            icon="Cpu",
            color="rose",
            order=4
        )
    ]
    save_routines(default_routines)
    return default_routines

def save_routines(routines: List[RoutineModel]):
    with open(ROUTINES_FILE, "w", encoding="utf-8") as f:
        json.dump([r.model_dump() for r in routines], f, ensure_ascii=False, indent=2)

def load_snippets() -> List[SnippetModel]:
    if SNIPPETS_FILE.exists():
        try:
            with open(SNIPPETS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [SnippetModel(**item) for item in data]
        except Exception:
            pass
    # Default built-in quick snippets
    default_snippets = [
        SnippetModel(id="snip_locate", text="\u0623\u064a\u0646 \u062c\u0647\u0627\u0632 \u0631\u0642\u0645 ", order=1),
        SnippetModel(id="snip_completed", text="\u062a\u0645 \u0625\u0646\u062c\u0627\u0632 ", order=2),
        SnippetModel(id="snip_pending", text="\u064a\u0648\u062c\u062f \u0623\u062c\u0647\u0632\u0629 \u0644\u0645 \u062a\u0628\u062f\u0623: ", order=3),
        SnippetModel(id="snip_go_to", text="\u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u0648\u062c\u0647 \u0625\u0644\u0649 ", order=4),
        SnippetModel(id="snip_reminder", text="\u062a\u0630\u0643\u064a\u0631: ", order=5),
        SnippetModel(id="snip_urgent", text="\u0639\u0627\u062c\u0644 \u062c\u062f\u0627\u064b: ", order=6),
        SnippetModel(id="snip_meeting", text="\u0627\u062c\u062a\u0645\u0627\u0639 \u0641\u0648\u0631\u064a \u0641\u064a \u0642\u0627\u0639\u0629 \u0627\u0644\u062a\u0646\u0633\u064a\u0642 ", order=7)
    ]
    save_snippets(default_snippets)
    return default_snippets

def save_snippets(snippets: List[SnippetModel]):
    with open(SNIPPETS_FILE, "w", encoding="utf-8") as f:
        json.dump([s.model_dump() for s in snippets], f, ensure_ascii=False, indent=2)
