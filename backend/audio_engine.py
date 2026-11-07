import asyncio
import os
import re
import time
import uuid
import datetime
from pathlib import Path
from typing import Optional, List, Set
from fastapi import WebSocket
import edge_tts

from backend.config import (
    load_settings, save_settings, PRESETS_DIR, CHIMES_DIR, TEMP_DIR,
    load_audit, save_audit, AuditEntry
)

# Common Arabic tech abbreviations dictionary to reduce TTS mispronunciations
TECH_REPLACEMENTS_AR = [
    (r'\bCI/CD\b', 'سي آي سي دي'),
    (r'\bCICD\b', 'سي آي سي دي'),
    (r'\bDevOps\b', 'ديف أوبس'),
    (r'\bdevops\b', 'ديف أوبس'),
    (r'\bPRs\b', 'بي آرز'),
    (r'\bPR\b', 'بي آر'),
    (r'\bProd\b', 'برودكشن'),
    (r'\bprod\b', 'برودكشن'),
    (r'\bAPIs\b', 'إي بي آيز'),
    (r'\bAPI\b', 'إي بي آي'),
    (r'\bapi\b', 'إي بي آي'),
    (r'\bAWS\b', 'إيه دابليو إس'),
    (r'\bUI/UX\b', 'يو آي يو إكس'),
    (r'\bUI\b', 'يو آي'),
    (r'\bUX\b', 'يو إكس'),
    (r'\bCPU\b', 'سي بي يو'),
    (r'\bRAM\b', 'رام'),
    (r'\bFrontend\b', 'فرونت إند'),
    (r'\bfrontend\b', 'فرونت إند'),
    (r'\bBackend\b', 'باك إند'),
    (r'\bbackend\b', 'باك إند'),
    (r'\bDeploy\b', 'ديبلويمِنت'),
    (r'\bdeploy\b', 'ديبلويمِنت'),
    (r'\bServers?\b', 'سيرفر'),
    (r'\bservers?\b', 'سيرفر'),
    (r'\bWi-?Fi\b', 'واي فاي'),
    (r'\bwi-?fi\b', 'واي فاي'),
    (r'\bGit\b', 'جِت'),
    (r'\bCode Freeze\b', 'كود فريز'),
    (r'\bcode freeze\b', 'كود فريز'),
    (r'\bStandup\b', 'ستاند أب'),
    (r'\bstandup\b', 'ستاند أب'),
    (r'\bSprint\b', 'سبرينت'),
    (r'\bsprint\b', 'سبرينت'),
    (r'\bRetro\b', 'ريترو'),
    (r'\bretro\b', 'ريترو'),
    (r'\bOn-?Call\b', 'أون كول'),
    (r'\bon-?call\b', 'أون كول'),
    (r'\bTech Lead\b', 'تيك ليد'),
    (r'\bISP\b', 'مزود الخدمة'),
]

TECH_REPLACEMENTS_EN = [
    (r'\bCI/CD\b', 'C I C D'),
    (r'\bCICD\b', 'C I C D'),
    (r'\bPR\b', 'P R'),
    (r'\bPRs\b', 'P R s'),
    (r'\bAPI\b', 'A P I'),
    (r'\bAPIs\b', 'A P Is'),
    (r'\bUI/UX\b', 'U I U X'),
    (r'\bUI\b', 'U I'),
    (r'\bUX\b', 'U X'),
    (r'\bCPU\b', 'C P U'),
    (r'\bRAM\b', 'Ram'),
    (r'\bAWS\b', 'A W S'),
    (r'\bWiFi\b', 'Wi-Fi'),
]

def remove_emojis(text: str) -> str:
    """Safely strip emojis without touching Latin or Arabic unicode characters"""
    return ''.join(c for c in text if not (0x1F000 <= ord(c) <= 0x1FFFF or 0x2600 <= ord(c) <= 0x27BF or ord(c) in (0xFE0F, 0xFE0E)))

def detect_language(text: str) -> str:
    """Detect if text is primarily Arabic ('ar') or English ('en')"""
    arabic_chars = len(re.findall(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]', text))
    english_chars = len(re.findall(r'[a-zA-Z]', text))
    return 'en' if english_chars > arabic_chars else 'ar'

def clean_and_normalize_text(text: str, lang: str = "ar") -> str:
    """Intelligent Phonetic Normalizer to reduce TTS pronunciation mistakes"""
    # 1. Safely remove emojis
    cleaned = remove_emojis(text)

    # 2. Normalize whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    # 3. Apply tech term phonetic expansions
    if lang == "ar":
        for pattern, replacement in TECH_REPLACEMENTS_AR:
            cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
    else:
        for pattern, replacement in TECH_REPLACEMENTS_EN:
            cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)

    # 4. Clean repeated punctuations
    cleaned = re.sub(r'[\?!]{2,}', lambda m: m.group(0)[0], cleaned)
    cleaned = re.sub(r'\.{4,}', '...', cleaned)

    # 5. Ensure smooth ending cadence
    if cleaned and not cleaned.endswith(('.', '!', '?', '،', '؛')):
        cleaned += '.'

    return cleaned

class AudioEngine:
    def __init__(self):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.status: str = "ready" # "ready" | "speaking" | "queued"
        self.current_item: Optional[dict] = None
        self.active_websockets: Set[WebSocket] = set()
        self.last_enqueued_time: float = 0.0
        self.last_speech_time: float = 0.0
        self.worker_task: Optional[asyncio.Task] = None
        self.volume_monitor_task: Optional[asyncio.Task] = None
        self._last_known_volume: Optional[int] = None
        self._current_process: Optional[asyncio.subprocess.Process] = None

    def start(self):
        if not self.worker_task or self.worker_task.done():
            self.worker_task = asyncio.create_task(self._queue_worker())
        if not self.volume_monitor_task or self.volume_monitor_task.done():
            self.volume_monitor_task = asyncio.create_task(self._volume_monitor_loop())

    async def _volume_monitor_loop(self):
        """Continuously watch system audio sink volume to sync with website slider in real-time"""
        self._last_known_volume = self.get_volume_sync()
        while True:
            await asyncio.sleep(1.0)
            try:
                current_vol = self.get_volume_sync()
                if self._last_known_volume is not None and current_vol != self._last_known_volume:
                    self._last_known_volume = current_vol
                    settings = load_settings()
                    if settings.server_volume != current_vol:
                        settings.server_volume = current_vol
                        save_settings(settings)
                    await self.broadcast_state()
            except Exception as e:
                pass

    async def connect_ws(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.add(websocket)
        await websocket.send_json(self.get_state_dict())

    def disconnect_ws(self, websocket: WebSocket):
        self.active_websockets.discard(websocket)

    def get_state_dict(self) -> dict:
        settings = load_settings()
        vol = self.get_volume_sync()
        return {
            "status": self.status,
            "current_item": self.current_item,
            "queue_length": self.queue.qsize(),
            "server_volume": vol,
            "settings": settings.model_dump()
        }

    async def broadcast_state(self):
        data = self.get_state_dict()
        disconnected = set()
        for ws in self.active_websockets:
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.add(ws)
        for ws in disconnected:
            self.active_websockets.discard(ws)

    def get_volume_sync(self) -> int:
        try:
            cmd = ["wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@"]
            res = os.popen(" ".join(cmd)).read()
            match = re.search(r"Volume:\s+([0-9.]+)", res)
            if match:
                vol = int(round(float(match.group(1)) * 100))
                return min(100, max(0, vol))
        except Exception:
            pass
        settings = load_settings()
        return settings.server_volume

    async def set_volume(self, volume: int) -> int:
        volume = max(0, min(100, volume))
        settings = load_settings()
        settings.server_volume = volume
        save_settings(settings)
        try:
            val_float = f"{volume / 100:.2f}"
            proc = await asyncio.create_subprocess_exec(
                "wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", val_float,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            await proc.wait()
        except Exception as e:
            print(f"Warning setting wpctl volume: {e}")
        await self.broadcast_state()
        return volume

    def check_cooldown(self) -> tuple[bool, int]:
        settings = load_settings()
        if not settings.spam_cooldown_enabled:
            return True, 0
        if self.last_enqueued_time <= 0:
            return True, 0
        now = time.time()
        elapsed = now - self.last_enqueued_time
        remaining = int(settings.cooldown_seconds - elapsed)
        if remaining > 0:
            return False, remaining
        return True, 0

    async def play_audio_file(self, file_path: Path):
        if not file_path.exists():
            print(f"Audio file not found: {file_path}")
            return
        try:
            self._current_process = await asyncio.create_subprocess_exec(
                "mpv",
                "--no-video",
                "--really-quiet",
                "--ao=pipewire,pulse,alsa",
                str(file_path),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            await self._current_process.wait()
        except Exception as e:
            print(f"Error during audio playback: {e}")
        finally:
            self._current_process = None

    def select_voice_for_text(self, text: str, requested_voice: Optional[str] = None) -> tuple[str, str]:
        """Returns (voice_name, language_code)"""
        settings = load_settings()
        lang = detect_language(text)

        if requested_voice:
            return requested_voice, lang

        if lang == 'en':
            voice = settings.tts_voice_en or "en-US-JennyNeural"
        else:
            voice = settings.tts_voice_ar or "ar-SY-LaithNeural"
        return voice, lang

    async def generate_tts(self, text: str, output_path: Path, voice: Optional[str] = None):
        settings = load_settings()
        selected_voice, lang = self.select_voice_for_text(text, voice)

        # Smart phonetic normalization to reduce mispronunciations
        if settings.smart_pronunciation_enabled:
            normalized_text = clean_and_normalize_text(text, lang)
        else:
            normalized_text = text

        rate = settings.speech_rate or "+0%"
        pitch = settings.speech_pitch or "+0Hz"

        communicate = edge_tts.Communicate(
            normalized_text,
            selected_voice,
            rate=rate,
            pitch=pitch
        )
        await communicate.save(str(output_path))

    async def ensure_preset_cached(self, preset_id: str, text: str, lang: str = "ar", voice: Optional[str] = None) -> Path:
        target = PRESETS_DIR / f"{preset_id}_{lang}.mp3"
        legacy_target = PRESETS_DIR / f"{preset_id}.mp3"

        if target.exists() and target.stat().st_size > 1000:
            return target
        if legacy_target.exists() and legacy_target.stat().st_size > 1000:
            return legacy_target

        print(f"Caching preset {preset_id} [{lang}]...")
        await self.generate_tts(text, target, voice)
        return target

    async def enqueue(self, title: str, text: str, source: str = "custom", preset_id: Optional[str] = None, sender_ip: Optional[str] = None, lang: Optional[str] = None) -> dict:
        item_id = str(uuid.uuid4())[:8]
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        detected_lang = lang or detect_language(text)

        # Save to Audit log
        audit = load_audit()
        entry = {
            "id": item_id,
            "timestamp": timestamp,
            "title": title or ("نداء صوتي" if detected_lang == "ar" else "Voice Announcement"),
            "text": text,
            "source": source,
            "sender_ip": sender_ip or "Local",
            "language": detected_lang
        }
        audit.append(entry)
        save_audit(audit)

        item = {
            "id": item_id,
            "title": title or ("نداء صوتي" if detected_lang == "ar" else "Voice Announcement"),
            "text": text,
            "source": source,
            "preset_id": preset_id,
            "timestamp": timestamp,
            "language": detected_lang
        }

        self.last_enqueued_time = time.time()
        self.last_speech_time = time.time()
        await self.queue.put(item)
        if self.status == "ready":
            self.status = "queued"
        await self.broadcast_state()
        return item

    async def _queue_worker(self):
        while True:
            item = await self.queue.get()
            try:
                self.status = "speaking"
                self.current_item = item
                await self.broadcast_state()

                settings = load_settings()

                # 1. Pre-Announcement Chime
                if settings.pre_chime_enabled:
                    chime_file = CHIMES_DIR / f"{settings.chime_tone}.mp3"
                    if chime_file.exists():
                        await self.play_audio_file(chime_file)

                # 2. Bluetooth Wake-up Ping / Delay
                if settings.bluetooth_wakeup_enabled:
                    # 400ms silence to let bluetooth A2DP codec and speaker un-mute
                    await asyncio.sleep(0.4)

                # 3. Speech Playback
                preset_id = item.get("preset_id")
                lang = item.get("language") or detect_language(item["text"])
                temp_file = None

                if preset_id:
                    # Look for language-specific cached file or generic
                    preset_path = PRESETS_DIR / f"{preset_id}_{lang}.mp3"
                    if not preset_path.exists():
                        legacy_path = PRESETS_DIR / f"{preset_id}.mp3"
                        if legacy_path.exists():
                            preset_path = legacy_path
                        else:
                            await self.ensure_preset_cached(preset_id, item["text"], lang)
                    audio_to_play = preset_path
                else:
                    temp_file = TEMP_DIR / f"{uuid.uuid4().hex}.mp3"
                    await self.generate_tts(item["text"], temp_file)
                    audio_to_play = temp_file

                if audio_to_play.exists():
                    await self.play_audio_file(audio_to_play)

                if temp_file and temp_file.exists():
                    try:
                        temp_file.unlink()
                    except Exception:
                        pass

            except Exception as ex:
                print(f"Error executing speech queue item: {ex}")
            finally:
                self.current_item = None
                self.queue.task_done()
                if self.queue.empty():
                    self.status = "ready"
                else:
                    self.status = "queued"
                await self.broadcast_state()

audio_engine = AudioEngine()
