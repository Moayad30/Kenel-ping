import asyncio
import json
from pathlib import Path
import edge_tts

PRESETS_FILE = Path("/home/moayad/kernelping/storage/presets.json")
OUTPUT_DIR = Path("/home/moayad/kernelping/storage/presets")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

VOICE = "ar-SY-LaithNeural"

async def generate_all():
    with open(PRESETS_FILE, "r", encoding="utf-8") as f:
        presets = json.load(f)

    print(f"Total presets to check/cache: {len(presets)}")
    for i, p in enumerate(presets, 1):
        target = OUTPUT_DIR / f"{p['id']}.mp3"
        if target.exists() and target.stat().st_size > 1000:
            print(f"[{i}/{len(presets)}] Already cached: {p['title']} ({p['id']}.mp3)")
            continue

        print(f"[{i}/{len(presets)}] Generating: {p['title']}...")
        try:
            communicate = edge_tts.Communicate(p["text"], VOICE)
            await communicate.save(str(target))
            print(f"   -> Generated {target.stat().st_size} bytes")
        except Exception as e:
            print(f"   -> ERROR for {p['id']}: {e}")

    print("Preset audio generation finished!")

if __name__ == "__main__":
    asyncio.run(generate_all())

