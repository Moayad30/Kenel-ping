import React, { useState, useRef, useEffect } from 'react';
import {
  Mic, Square, Play, Pause, RotateCcw, Send, Radio, ShieldCheck,
  AlertCircle, Loader2, RefreshCw, KeyRound
} from 'lucide-react';
import { useThemeLang } from '../context/ThemeLanguageContext';

export default function AdminVoiceRecorder({ token, onBroadcastSuccess }) {
  const { theme, t } = useThemeLang();

  // Recording lifecycle: 'idle' | 'recording' | 'paused' | 'stopped' | 'broadcasting'
  const [recorderStatus, setRecorderStatus] = useState('idle');
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const cleanupResources = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start voice recording with persistent permission error handling
  const handleStartRecording = async () => {
    setIsRequestingMic(true);
    setAudioBlob(null);
    audioChunksRef.current = [];
    setRecordDuration(0);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("Microphone access is not supported by your browser or connection is not secure (requires HTTPS or localhost).");
      setMicPermissionDenied(true);
      setIsRequestingMic(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      setMicPermissionDenied(false);
      setErrorMessage(null);

      // Web Audio Visualizer
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateLevel);
          }
        };
        updateLevel();
      } catch (audioErr) {
        console.warn("AudioContext visualizer unsupported:", audioErr);
      }

      // Format selection
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setRecorderStatus('stopped');
        setAudioLevel(0);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      mediaRecorder.start(200);
      setRecorderStatus('recording');

      timerIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 60) {
            handleStopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Microphone permission error:", err);
      setMicPermissionDenied(true);
      setErrorMessage(t.micAccessError);
      setRecorderStatus('idle');
    } finally {
      setIsRequestingMic(false);
    }
  };

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setRecorderStatus('paused');
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
      setRecorderStatus('recording');
    }
  };

  const handleStopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const handleDiscardRecording = () => {
    cleanupResources();
    setRecorderStatus('idle');
    setRecordDuration(0);
    setAudioBlob(null);
    setAudioLevel(0);
  };

  // Direct broadcast to speaker with zero retention (NO preview player)
  const handleBroadcastVoice = async () => {
    if (!audioBlob) return;
    setRecorderStatus('broadcasting');
    setErrorMessage(null);

    const formData = new FormData();
    const ext = audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    formData.append('file', audioBlob, `admin_voice_${Date.now()}.${ext}`);

    try {
      const res = await fetch('/api/admin/broadcast-voice', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        if (onBroadcastSuccess) {
          onBroadcastSuccess(t.voiceBroadcastSuccess);
        }
        handleDiscardRecording();
      } else {
        setErrorMessage(data.detail || t.errorGeneric);
        setRecorderStatus('stopped');
      }
    } catch {
      setErrorMessage(t.errorNetwork);
      setRecorderStatus('stopped');
    }
  };

  return (
    <section className={`border rounded-3xl p-6 sm:p-7 shadow-2xl transition-all duration-200 mb-8 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-[#0B132B] via-[#0E1B38] to-[#070C1B] border-[#1F3152]' 
        : 'bg-white border-slate-200 shadow-slate-100'
    }`}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/30 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
            recorderStatus === 'recording'
              ? 'bg-rose-500/20 border-rose-500 text-rose-500 animate-pulse'
              : theme === 'dark' ? 'bg-[#00D2FF]/10 border-[#00D2FF]/30 text-[#00D2FF]' : 'bg-sky-50 border-sky-200 text-sky-600'
          }`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {t.adminVoiceTitle}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Admin Exclusive
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {t.adminVoiceSubtitle}
            </p>
          </div>
        </div>

        {/* Zero Retention Security Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Zero Retention</span>
        </div>
      </div>

      {/* Persistent Microphone Blocked Helper Card */}
      {micPermissionDenied && (
        <div className="mb-5 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs shadow-lg shadow-rose-500/10">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-200 mb-1">{t.micBlockedTitle}</p>
              <ul className="space-y-1 text-xs opacity-90 list-disc list-inside">
                <li>{t.micBlockedStep1}</li>
                <li>{t.micBlockedStep2}</li>
                <li>{t.micBlockedStep3}</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={isRequestingMic}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isRequestingMic ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>{isRequestingMic ? 'Checking...' : t.micCheckAgainBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Recording Container */}
      <div className={`p-5 rounded-2xl border transition-all ${
        theme === 'dark' ? 'bg-[#070C1B]/70 border-[#1F3152]' : 'bg-slate-50 border-slate-200'
      }`}>

        {/* State 1: Idle - Ready to record */}
        {recorderStatus === 'idle' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 py-2">
            <div className="flex items-center gap-3 text-center sm:text-start">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {t.adminVoiceSubtitle}
                </p>
                <p className="text-xs opacity-65">
                  Max length: 60s • Automatic instant deletion
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartRecording}
              disabled={isRequestingMic}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isRequestingMic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              <span>{isRequestingMic ? 'Connecting Mic...' : t.startRecordBtn}</span>
            </button>
          </div>
        )}

        {/* State 2 & 3: Recording or Paused */}
        {(recorderStatus === 'recording' || recorderStatus === 'paused') && (
          <div className="space-y-4 py-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Timer */}
              <div className="flex items-center gap-3">
                <span className={`w-3.5 h-3.5 rounded-full ${
                  recorderStatus === 'recording' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'
                }`} />
                <div>
                  <span className="font-mono text-xl font-black text-rose-400 tracking-wider">
                    {formatDuration(recordDuration)}
                  </span>
                  <span className="text-xs font-mono opacity-50 ml-1.5 mr-1.5">/ 01:00</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  recorderStatus === 'recording'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {recorderStatus === 'recording' ? t.recordingInProgress : t.recordingPaused}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {recorderStatus === 'recording' ? (
                  <button
                    type="button"
                    onClick={handlePauseRecording}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                      theme === 'dark' ? 'bg-[#121C33] border-[#1F3152] text-amber-400' : 'bg-slate-100 border-slate-200 text-amber-700'
                    }`}
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>{t.pauseRecordBtn}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResumeRecording}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{t.resumeRecordBtn}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{t.stopRecordBtn}</span>
                </button>
              </div>
            </div>

            {/* Visualizer Bar */}
            <div className="w-full bg-slate-800/60 rounded-xl h-3 p-0.5 overflow-hidden flex items-center gap-1">
              {Array.from({ length: 24 }).map((_, idx) => {
                const barHeight = Math.max(15, Math.min(100, (audioLevel * (idx % 3 + 1)) % 100));
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-gradient-to-t from-cyan-500 to-rose-500 rounded-full transition-all duration-75"
                    style={{
                      height: recorderStatus === 'recording' ? `${barHeight}%` : '20%',
                      opacity: recorderStatus === 'recording' ? 0.9 : 0.3
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* State 4 & 5: Stopped / Ready to broadcast (NO PREVIEW PLAYER) */}
        {(recorderStatus === 'stopped' || recorderStatus === 'broadcasting') && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div>
                <p className="text-xs font-bold text-emerald-400">
                  {t.recordingFinished}
                </p>
                <span className="text-xs font-mono font-bold text-white">
                  Duration: {formatDuration(recordDuration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDiscardRecording}
                  disabled={recorderStatus === 'broadcasting'}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all disabled:opacity-50 ${
                    theme === 'dark' ? 'bg-[#121C33] border-[#1F3152] text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.discardVoiceBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBroadcastVoice}
                  disabled={recorderStatus === 'broadcasting'}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/20 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                  {recorderStatus === 'broadcasting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{t.broadcastingVoice}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{t.stopAndBroadcastBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] opacity-70 text-center sm:text-start">
              {t.zeroRetentionNotice}
            </p>
          </div>
        )}

      </div>
    </section>
  );
}
