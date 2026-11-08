import asyncio
import os
import re
import time
import uuid
import datetime
import subprocess
from pathlib import Path
from typing import Optional, List, Set
from fastapi import WebSocket
import edge_tts

from backend.config import (
    load_settings, save_settings, PRESETS_DIR, CHIMES_DIR, TEMP_DIR,
    load_audit, save_audit
)

def remove_emojis(text: str) -> str:
    """Safely remove emoji icons while preserving all Arabic and Latin letters and numerals."""
    return ''.join(
        c for c in text 
        if not (0x1F000 <= ord(c) <= 0x1FFFF or 0x2600 <= ord(c) <= 0x27BF or ord(c) in (0xFE0F, 0xFE0E))
    )

def detect_language(text: str) -> str:
    """Detect whether the text is primarily Arabic ('ar') or English ('en')."""
    arabic_chars = len(re.findall(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]', text))
    english_chars = len(re.findall(r'[a-zA-Z]', text))
    return 'en' if english_chars > arabic_chars else 'ar'

def clean_and_normalize_text(text: str, lang: str = "ar") -> str:
    """Standard office phonetic cleanup: strip emojis, normalize whitespace and punctuation."""
    cleaned = remove_emojis(text)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    cleaned = re.sub(r'[\?!]{2,}', lambda m: m.group(0)[0], cleaned)
    cleaned = re.sub(r'\.{4,}', '...', cleaned)
    if cleaned and not cleaned.endswith(('.', '!', '?', '\u060C', '\u061B')):
        cleaned += '.'
    return cleaned

def get_audio_device_info() -> dict:
    """
    Detect the active audio sink / connected sound card.
    Identifies whether an external speaker (Bluetooth / USB) is connected
    or the internal device sound card (e.g. ALC256 / HD-Audio Generic).
    """
    info = {
        "device_name": "Internal Device Audio",
        "card_type": "internal",  # "internal" | "bluetooth" | "usb" | "hdmi"
        "is_bluetooth": False,
        "is_external_speaker": False,
        "speaker_connected": False,
        "active_output": "internal_card",
        "label_ar": "Device Audio Ready",
        "label_en": "Device Audio Ready",
        "card_details": "Internal Sound Card"
    }

    # 1. Inspect WirePlumber / PipeWire default audio sink
    try:
        env = os.environ.copy()
        if "XDG_RUNTIME_DIR" not in env and os.path.exists(f"/run/user/{os.getuid()}"):
            env["XDG_RUNTIME_DIR"] = f"/run/user/{os.getuid()}"
        res = subprocess.run(
            ["wpctl", "inspect", "@DEFAULT_AUDIO_SINK@"],
            capture_output=True,
            text=True,
            timeout=1,
            env=env
        )
        if res.returncode == 0 and res.stdout:
            desc_match = re.search(r'node\.description\s*=\s*"([^"]+)"', res.stdout)
            nick_match = re.search(r'node\.nick\s*=\s*"([^"]+)"', res.stdout)
            name_match = re.search(r'device\.description\s*=\s*"([^"]+)"', res.stdout)
            chosen = (
                desc_match.group(1) if desc_match else 
                (nick_match.group(1) if nick_match else 
                (name_match.group(1) if name_match else ""))
            )
            if chosen:
                info["device_name"] = chosen
                info["card_details"] = chosen
                lower = chosen.lower()
                if any(w in lower for w in ["blue", "a2dp", "headset", "speaker", "bluetooth"]):
                    info["card_type"] = "bluetooth"
                    info["is_bluetooth"] = True
                    info["is_external_speaker"] = True
                    info["speaker_connected"] = True
                    info["active_output"] = "speaker"
                    info["label_ar"] = "Speaker Ready"
                    info["label_en"] = "Speaker Ready"
                elif "usb" in lower:
                    info["card_type"] = "usb"
                    info["is_external_speaker"] = True
                    info["speaker_connected"] = True
                    info["active_output"] = "speaker"
                    info["label_ar"] = "USB Speaker Ready"
                    info["label_en"] = "USB Speaker Ready"
                elif "hdmi" in lower:
                    info["card_type"] = "hdmi"
                    info["is_external_speaker"] = False
                    info["speaker_connected"] = False
                    info["active_output"] = "internal_card"
                    info["label_ar"] = "HDMI Audio Ready"
                    info["label_en"] = "HDMI Audio Ready"
                else:
                    info["card_type"] = "internal"
                    info["is_external_speaker"] = False
                    info["speaker_connected"] = False
                    info["active_output"] = "internal_card"
                    info["label_ar"] = "Device Audio Ready"
                    info["label_en"] = "Device Audio Ready"
                return info
    except Exception:
        pass

    # 2. Inspect ALSA hardware playback cards
    try:
        res = subprocess.run(["aplay", "-l"], capture_output=True, text=True, timeout=1)
        if res.returncode == 0 and res.stdout:
            for line in res.stdout.splitlines():
                if "card" in line and ("Analog" in line or "ALC" in line or "Generic" in line):
                    m = re.search(r"card \d+: (\w+) \[([^\]]+)\], device \d+: ([^\[]+) \[([^\]]+)\]", line)
                    if m:
                        chip_name = f"{m.group(2)} ({m.group(4)})"
                        info["device_name"] = chip_name
                        info["card_details"] = f"Internal Sound Card ({chip_name})"
                        info["card_type"] = "internal"
                        info["is_external_speaker"] = False
                        info["speaker_connected"] = False
                        info["active_output"] = "internal_card"
                        info["label_ar"] = "Device Audio Ready"
                        info["label_en"] = "Device Audio Ready"
                        return info
    except Exception:
        pass

    # 3. Read /proc/asound/cards as fallback
    try:
        if os.path.exists("/proc/asound/cards"):
            with open("/proc/asound/cards", "r", encoding="utf-8") as f:
                content_cards = f.read().strip()
                lines = [l.strip() for l in content_cards.splitlines() if l.strip()]
                for line in lines:
                    if any(k in line for k in ["Generic", "ALC", "Realtek", "Analog"]):
                        name = line.split(":")[-1].strip() if ":" in line else line
                        info["device_name"] = f"HD-Audio ({name})"
                        info["card_details"] = name
                        info["card_type"] = "internal"
                        info["is_external_speaker"] = False
                        info["speaker_connected"] = False
                        info["active_output"] = "internal_card"
                        info["label_ar"] = "Device Audio Ready"
                        info["label_en"] = "Device Audio Ready"
                        return info
                if lines:
                    name = lines[0].split(":")[-1].strip() if ":" in lines[0] else lines[0]
                    info["device_name"] = name
                    info["card_details"] = name
                    info["is_external_speaker"] = False
                    info["speaker_connected"] = False
                    info["active_output"] = "internal_card"
    except Exception:
        pass

    return info

def get_paired_bluetooth_devices() -> list:
    """List paired Bluetooth audio devices on the host system."""
    devices = []
    try:
        res = subprocess.run(["bluetoothctl", "paired-devices"], capture_output=True, text=True, timeout=2)
        if res.returncode == 0 and res.stdout:
            for line in res.stdout.splitlines():
                m = re.match(r"Device\s+([0-9A-Fa-f:]{17})\s+(.+)", line.strip())
                if m:
                    devices.append({
                        "mac": m.group(1),
                        "name": m.group(2).strip()
                    })
    except Exception:
        pass
    return devices

async def reconnect_bluetooth_speaker(target_mac: Optional[str] = None) -> dict:
    """
    Attempts to connect or reconnect to the office Bluetooth speaker.
    Allows members or admin to reconnect the speaker remotely without physical access to the server.
    """
    settings = load_settings()
    mac = target_mac or settings.bluetooth_speaker_mac

    paired = get_paired_bluetooth_devices()
    if not mac and paired:
        speaker_candidate = next(
            (d for d in paired if any(k in d["name"].lower() for k in ["speaker", "flip", "charge", "sound", "audio", "bt", "bafle"])),
            paired[0]
        )
        mac = speaker_candidate["mac"]
        settings.bluetooth_speaker_mac = mac
        settings.bluetooth_speaker_name = speaker_candidate["name"]
        save_settings(settings)

    if not mac:
        return {
            "success": False,
            "message": "No paired Bluetooth speaker found. Please pair the speaker in Bluetooth settings first.",
            "device": get_audio_device_info()
        }

    try:
        proc = await asyncio.create_subprocess_exec(
            "bluetoothctl", "connect", mac,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=8.0)
        out_str = (stdout.decode(errors="ignore") + " " + stderr.decode(errors="ignore")).strip()

        await asyncio.sleep(1.0)
        info = get_audio_device_info()
        is_connected = info.get("is_external_speaker", False) or "Connection successful" in out_str

        device_name = info.get("device_name", "Bluetooth Speaker")
        if is_connected:
            settings.bluetooth_speaker_mac = mac
            settings.bluetooth_speaker_name = device_name
            save_settings(settings)
            await audio_engine.broadcast_state()
            return {
                "success": True,
                "message": f"Successfully connected to speaker: {device_name}",
                "device": info
            }
        else:
            return {
                "success": False,
                "message": f"Reconnect signal sent to {mac}. Please make sure the speaker is powered on and within range.",
                "details": out_str[:120],
                "device": info
            }
    except asyncio.TimeoutError:
        return {
            "success": False,
            "message": "Connection attempt timed out. Please ensure the speaker is turned on.",
            "device": get_audio_device_info()
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Bluetooth connection error: {str(e)}",
            "device": get_audio_device_info()
        }


class AudioEngine:
    def __init__(self):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.status: str = "ready"  # "ready" | "speaking" | "queued"
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
        """Continuously watch system audio sink volume to sync with UI slider in real-time."""
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
            except Exception:
                pass

    async def connect_ws(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.add(websocket)
        await websocket.send_json(self.get_state_dict())

    def disconnect_ws(self, websocket: WebSocket):
        self.active_websockets.discard(websocket)

    def get_cooldown_remaining(self) -> int:
        settings = load_settings()
        if not settings.spam_cooldown_enabled or self.last_enqueued_time <= 0:
            return 0
        elapsed = time.time() - self.last_enqueued_time
        remaining = int(settings.cooldown_seconds - elapsed)
        return max(0, remaining)

    def get_state_dict(self) -> dict:
        settings = load_settings()
        vol = self.get_volume_sync()
        device_info = get_audio_device_info()
        return {
            "status": self.status,
            "current_item": self.current_item,
            "queue_length": self.queue.qsize(),
            "server_volume": vol,
            "cooldown_remaining": self.get_cooldown_remaining(),
            "audio_device": device_info,
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
            env = os.environ.copy()
            if "XDG_RUNTIME_DIR" not in env and os.path.exists(f"/run/user/{os.getuid()}"):
                env["XDG_RUNTIME_DIR"] = f"/run/user/{os.getuid()}"
            res = subprocess.run(
                ["wpctl", "get-volume", "@DEFAULT_AUDIO_SINK@"],
                capture_output=True,
                text=True,
                timeout=1,
                env=env
            )
            match = re.search(r"Volume:\s+([0-9.]+)", res.stdout)
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
            env = os.environ.copy()
            if "XDG_RUNTIME_DIR" not in env and os.path.exists(f"/run/user/{os.getuid()}"):
                env["XDG_RUNTIME_DIR"] = f"/run/user/{os.getuid()}"
            proc = await asyncio.create_subprocess_exec(
                "wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", val_float,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
                env=env
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

    async def play_audio_file(self, file_path: Path, volume: Optional[int] = None):
        if not file_path.exists():
            print(f"Audio file not found: {file_path}")
            return
        try:
            cmd = [
                "mpv",
                "--no-video",
                "--really-quiet",
                "--ao=pipewire,pulse,alsa",
            ]
            if volume is not None:
                cmd.append(f"--volume={volume}")
            cmd.append(str(file_path))

            self._current_process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            try:
                await asyncio.wait_for(self._current_process.wait(), timeout=60.0)
            except asyncio.TimeoutError:
                if self._current_process:
                    try:
                        self._current_process.kill()
                    except Exception:
                        pass
        except Exception as e:
            print(f"Error during audio playback: {e}")
        finally:
            self._current_process = None

    def select_voice_for_text(self, text: str, requested_voice: Optional[str] = None) -> tuple[str, str]:
        """Returns (voice_name, language_code)."""
        settings = load_settings()
        lang = detect_language(text)

        if requested_voice:
            return requested_voice, lang

        if lang == 'en':
            voice = settings.tts_voice_en or "en-US-AriaNeural"
        else:
            voice = settings.tts_voice_ar or "ar-SY-LaithNeural"
        return voice, lang

    async def generate_tts(self, text: str, output_path: Path, voice: Optional[str] = None):
        settings = load_settings()
        selected_voice, lang = self.select_voice_for_text(text, voice)
        normalized_text = clean_and_normalize_text(text, lang)

        rate = settings.speech_rate or "+0%"
        pitch = settings.speech_pitch or "+0Hz"

        communicate = edge_tts.Communicate(
            normalized_text,
            selected_voice,
            rate=rate,
            pitch=pitch
        )
        await communicate.save(str(output_path))

    async def ensure_preset_cached(self, preset_id: str, text: str, lang: Optional[str] = None, voice: Optional[str] = None) -> Path:
        detected_lang = lang or detect_language(text)
        target = PRESETS_DIR / f"{preset_id}_{detected_lang}.mp3"
        legacy_target = PRESETS_DIR / f"{preset_id}.mp3"

        if target.exists() and target.stat().st_size > 1000:
            return target
        if legacy_target.exists() and legacy_target.stat().st_size > 1000:
            return legacy_target

        print(f"Caching preset {preset_id} [{detected_lang}]...")
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
            "title": title or "Voice Announcement",
            "text": text,
            "source": source,
            "sender_ip": sender_ip or "Local",
            "language": detected_lang
        }
        audit.append(entry)
        save_audit(audit)

        item = {
            "id": item_id,
            "title": title or "Voice Announcement",
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

    async def broadcast_voice_recording(self, file_path: Path, sender_ip: str = "Admin") -> dict:
        """
        Directly broadcast recorded voice from admin to speaker, then immediately delete it.
        Guarantees zero storage retention.
        """
        item_id = str(uuid.uuid4())[:8]
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        audit = load_audit()
        audit.append({
            "id": item_id,
            "timestamp": timestamp,
            "title": "Live Voice Broadcast",
            "text": "[Live Admin Voice Announcement - Zero Retention]",
            "source": "admin_voice",
            "sender_ip": sender_ip,
            "language": "voice"
        })
        save_audit(audit)

        settings = load_settings()
        self.status = "speaking"
        self.current_item = {
            "id": item_id,
            "title": "Live Voice Broadcast",
            "text": "Admin live voice streaming...",
            "source": "admin_voice",
            "timestamp": timestamp,
            "language": "voice"
        }
        self.last_enqueued_time = time.time()
        await self.broadcast_state()

        try:
            # 1. Pre-announcement chime if enabled
            if settings.pre_chime_enabled:
                chime_file = CHIMES_DIR / f"{settings.chime_tone}.mp3"
                if chime_file.exists():
                    chime_vol = getattr(settings, 'chime_volume', 80)
                    await self.play_audio_file(chime_file, volume=chime_vol)

            # 2. Bluetooth wake-up delay
            if settings.bluetooth_wakeup_enabled:
                await asyncio.sleep(0.4)

            # 3. Play voice recording
            await self.play_audio_file(file_path)
        finally:
            # Strictly delete the temporary voice recording file immediately
            if file_path.exists():
                try:
                    file_path.unlink()
                except Exception as e:
                    print(f"Error unlinking temporary voice file: {e}")

            self.current_item = None
            if self.queue.empty():
                self.status = "ready"
            else:
                self.status = "queued"
            await self.broadcast_state()

        return {"id": item_id, "status": "broadcasted"}

    async def test_voice_recording_on_speaker(self, file_path: Path) -> dict:
        """Plays voice recording on the server speaker for preview, then immediately deletes it."""
        try:
            await self.play_audio_file(file_path)
            return {"success": True, "message": "Voice test played on speaker"}
        finally:
            if file_path.exists():
                try:
                    file_path.unlink()
                except Exception:
                    pass

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
                        chime_vol = getattr(settings, 'chime_volume', 80)
                        await self.play_audio_file(chime_file, volume=chime_vol)

                # 2. Bluetooth Wake-up Ping / Delay
                if settings.bluetooth_wakeup_enabled:
                    await asyncio.sleep(0.4)

                # 3. Speech Playback
                preset_id = item.get("preset_id")
                lang = item.get("language") or detect_language(item["text"])
                temp_file = None

                if preset_id:
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
