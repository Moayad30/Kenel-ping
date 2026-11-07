import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, "/home/moayad/kernelping")
import edge_tts
from backend.audio_engine import clean_and_normalize_text

PRESETS_FILE = Path("/home/moayad/kernelping/storage/presets.json")
OUTPUT_DIR = Path("/home/moayad/kernelping/storage/presets")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

VOICE_AR = "ar-SY-LaithNeural"
VOICE_EN = "en-US-AriaNeural"

async def generate_all():
    with open(PRESETS_FILE, "r", encoding="utf-8") as f:
        presets = json.load(f)

    print(f"Total presets to check/cache: {len(presets)}")
    for i, p in enumerate(presets, 1):
        # 1. Arabic
        text_ar = p.get("text_ar") or p.get("text")
        if text_ar:
            target_ar = OUTPUT_DIR / f"{p['id']}_ar.mp3"
            legacy_target = OUTPUT_DIR / f"{p['id']}.mp3"
            if not target_ar.exists() and legacy_target.exists():
                # Link or copy legacy
                target_ar.write_bytes(legacy_target.read_bytes())
            elif not target_ar.exists():
                print(f"[{i}/{len(presets)}] Generating AR: {p.get('title_ar') or p['title']}...")
                try:
                    norm = clean_and_normalize_text(text_ar, "ar")
                    comm = edge_tts.Communicate(norm, VOICE_AR)
                    await comm.save(str(target_ar))
                except Exception as e:
                    print(f"   -> AR Error: {e}")

        # 2. English
        text_en = p.get("text_en")
        if text_en:
            target_en = OUTPUT_DIR / f"{p['id']}_en.mp3"
            if not target_en.exists() or target_en.stat().st_size < 1000:
                print(f"[{i}/{len(presets)}] Generating EN: {p.get('title_en') or p['id']}...")
                try:
                    norm = clean_and_normalize_text(text_en, "en")
                    comm = edge_tts.Communicate(norm, VOICE_EN)
                    await comm.save(str(target_en))
                except Exception as e:
                    print(f"   -> EN Error: {e}")

    print("Bilingual preset audio generation finished!")

if __name__ == "__main__":
    asyncio.run(generate_all())
