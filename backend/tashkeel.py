import re
from typing import Optional

_tashkeeler = None

def get_tashkeeler():
    global _tashkeeler
    if _tashkeeler is None:
        try:
            import mishkal.tashkeel
            _tashkeeler = mishkal.tashkeel.TashkeelClass()
        except Exception as e:
            print(f"Warning: could not initialize mishkal tashkeeler: {e}")
            _tashkeeler = False
    return _tashkeeler

def diacritize_arabic(text: str) -> str:
    """
    Intelligently diacritizes Arabic text for optimal TTS pronunciation.
    Preserves English words, numbers, and technical terminology.
    """
    if not text or not text.strip():
        return text

    tashkeeler = get_tashkeeler()
    if not tashkeeler:
        return text.strip()

    try:
        # Mishkal diacritization
        result = tashkeeler.tashkeel(text.strip())
        # Clean extra leading/trailing whitespace
        result = re.sub(r'\s+', ' ', result).strip()
        return result
    except Exception as e:
        print(f"Tashkeel error: {e}")
        return text.strip()

