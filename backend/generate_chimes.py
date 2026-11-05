import os
import wave
import math
import struct
import subprocess

CHIMES_DIR = "/home/moayad/kernelping/storage/chimes"
os.makedirs(CHIMES_DIR, exist_ok=True)

SAMPLE_RATE = 44100

def generate_wav(filename, samples):
    with wave.open(filename, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        raw = b''.join(struct.pack('<h', int(max(-32767, min(32767, s * 32767)))) for s in samples)
        wf.writeframes(raw)

def convert_to_mp3(wav_path, mp3_path):
    cmd = ["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-b:a", "192k", mp3_path]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    if os.path.exists(wav_path):
        os.remove(wav_path)

def make_airport():
    # Airport ding-dong: 2 pleasant bell-like tones (587.33 Hz [D5] for 0.4s, then 440 Hz [A4] for 0.7s)
    # with soft exponential decay
    samples = []
    
    # Tone 1: 587.33 Hz
    dur1 = 0.35
    total_samples1 = int(SAMPLE_RATE * dur1)
    for i in range(total_samples1):
        t = i / SAMPLE_RATE
        envelope = math.exp(-3.5 * t)
        val = 0.7 * math.sin(2 * math.pi * 587.33 * t) + 0.2 * math.sin(2 * math.pi * 1174.66 * t)
        samples.append(val * envelope)
        
    # Brief pause: 0.05s
    samples.extend([0.0] * int(SAMPLE_RATE * 0.05))
    
    # Tone 2: 440 Hz
    dur2 = 0.7
    total_samples2 = int(SAMPLE_RATE * dur2)
    for i in range(total_samples2):
        t = i / SAMPLE_RATE
        envelope = math.exp(-2.5 * t)
        val = 0.75 * math.sin(2 * math.pi * 440.0 * t) + 0.2 * math.sin(2 * math.pi * 880.0 * t)
        samples.append(val * envelope)
        
    wav_path = os.path.join(CHIMES_DIR, "airport.wav")
    mp3_path = os.path.join(CHIMES_DIR, "airport.mp3")
    generate_wav(wav_path, samples)
    convert_to_mp3(wav_path, mp3_path)
    print("Generated airport chime")

def make_bell():
    # Crystal desk bell: 880 Hz with rich harmonics and longer sustain
    samples = []
    dur = 1.0
    total_samples = int(SAMPLE_RATE * dur)
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        envelope = math.exp(-3.0 * t)
        val = (
            0.6 * math.sin(2 * math.pi * 880.0 * t) +
            0.25 * math.sin(2 * math.pi * 1760.0 * t) +
            0.15 * math.sin(2 * math.pi * 2640.0 * t)
        )
        samples.append(val * envelope)
        
    wav_path = os.path.join(CHIMES_DIR, "bell.wav")
    mp3_path = os.path.join(CHIMES_DIR, "bell.mp3")
    generate_wav(wav_path, samples)
    convert_to_mp3(wav_path, mp3_path)
    print("Generated bell chime")

def make_alert():
    # Tech / Warning alert: Double beep (784 Hz [G5] -> 1046.5 Hz [C6])
    samples = []
    
    # Beep 1
    dur1 = 0.15
    for i in range(int(SAMPLE_RATE * dur1)):
        t = i / SAMPLE_RATE
        envelope = math.exp(-4.0 * t)
        val = 0.8 * math.sin(2 * math.pi * 784.0 * t)
        samples.append(val * envelope)
        
    # Gap
    samples.extend([0.0] * int(SAMPLE_RATE * 0.08))
    
    # Beep 2 (higher)
    dur2 = 0.35
    for i in range(int(SAMPLE_RATE * dur2)):
        t = i / SAMPLE_RATE
        envelope = math.exp(-3.0 * t)
        val = 0.85 * math.sin(2 * math.pi * 1046.5 * t)
        samples.append(val * envelope)
        
    wav_path = os.path.join(CHIMES_DIR, "alert.wav")
    mp3_path = os.path.join(CHIMES_DIR, "alert.mp3")
    generate_wav(wav_path, samples)
    convert_to_mp3(wav_path, mp3_path)
    print("Generated alert chime")

if __name__ == "__main__":
    make_airport()
    make_bell()
    make_alert()

