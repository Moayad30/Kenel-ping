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

class AudioEngine:
    def __init__(self):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.status: str = "ready" # "ready" | "speaking" | "queued"
        self.current_item: Optional[dict] = None
        self.active_websockets: Set[WebSocket] = set()
        self.last_speech_time: float = 0.0
        self.worker_task: Optional[asyncio.Task] = None
        self._current_process: Optional[asyncio.subprocess.Process] = None

    def start(self):
        if not self.worker_task or self.worker_task.done():
            self.worker_task = asyncio.create_task(self._queue_worker())

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
        now = time.time()
        elapsed = now - self.last_speech_time
        remaining = int(settings.cooldown_seconds - elapsed)
        if remaining > 0 and self.last_speech_time > 0:
            return False, remaining
        return True, 0

    async def play_audio_file(self, file_path: Path):
        if not file_path.exists():
            print(f"Audio file not found: {file_path}")
            return
        try:
            # mpv with pipewire/pulse default sink and no video
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

    async def generate_tts(self, text: str, output_path: Path, voice: Optional[str] = None):
        settings = load_settings()
        selected_voice = voice or settings.tts_voice or "ar-SY-LaithNeural"
        communicate = edge_tts.Communicate(text, selected_voice)
        await communicate.save(str(output_path))

    async def ensure_preset_cached(self, preset_id: str, text: str, voice: Optional[str] = None) -> Path:
        target = PRESETS_DIR / f"{preset_id}.mp3"
        if not target.exists() or target.stat().st_size == 0:
            print(f"Caching preset {preset_id}...")
            await self.generate_tts(text, target, voice)
        return target

    async def enqueue(self, title: str, text: str, source: str = "custom", preset_id: Optional[str] = None, sender_ip: Optional[str] = None) -> dict:
        item_id = str(uuid.uuid4())[:8]
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Save to Audit log
        audit = load_audit()
        entry = {
            "id": item_id,
            "timestamp": timestamp,
            "title": title or "نداء حر",
            "text": text,
            "source": source,
            "sender_ip": sender_ip or "Local"
        }
        audit.append(entry)
        save_audit(audit)

        item = {
            "id": item_id,
            "title": title or "نداء صوتي",
            "text": text,
            "source": source,
            "preset_id": preset_id,
            "timestamp": timestamp
        }

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
                self.last_speech_time = time.time()
                await self.broadcast_state()

                settings = load_settings()

                # 1. Pre-Announcement Chime
                if settings.pre_chime_enabled:
                    chime_file = CHIMES_DIR / f"{settings.chime_tone}.mp3"
                    if chime_file.exists():
                        await self.play_audio_file(chime_file)

                # 2. Bluetooth Wake-up Ping / Delay
                if settings.bluetooth_wakeup_enabled:
                    # 400ms silence to let bluetooth A2DP codec and speaker amp wake up
                    await asyncio.sleep(0.4)

                # 3. Speech Playback
                preset_id = item.get("preset_id")
                temp_file = None
                if preset_id:
                    preset_path = PRESETS_DIR / f"{preset_id}.mp3"
                    if not preset_path.exists():
                        await self.ensure_preset_cached(preset_id, item["text"], settings.tts_voice)
                    audio_to_play = preset_path
                else:
                    temp_file = TEMP_DIR / f"{uuid.uuid4().hex}.mp3"
                    await self.generate_tts(item["text"], temp_file, settings.tts_voice)
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
                self.last_speech_time = time.time()
                self.queue.task_done()
                if self.queue.empty():
                    self.status = "ready"
                else:
                    self.status = "queued"
                await self.broadcast_state()

audio_engine = AudioEngine()
