import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Volume2, VolumeX, Mic, Bell, Users, Calendar, Code, RotateCcw,
  PhoneCall, Rocket, CheckCircle2, Snowflake, AlertTriangle, AlertCircle, ServerCrash,
  Coffee, Utensils, Smile, Package, PartyPopper, ShieldAlert, WifiOff,
  Sparkles, Lock, Flame, Search, Send, Radio, Activity, Clock,
  Sun, Moon, Globe, Folder, Cpu, X, Headphones, Speaker, RefreshCw, Laptop, Zap, Square,
  ChevronDown, ChevronUp, ChevronsDown, ChevronsUp,
  Repeat, Infinity, Timer, ListOrdered
} from 'lucide-react';
import { useThemeLang } from '../context/ThemeLanguageContext';
import RoutineActions from './RoutineActions';
import QuickSnippets from './QuickSnippets';

const ICON_MAP = {
  Users, Calendar, Code, RotateCcw, PhoneCall, Rocket, CheckCircle2,
  Snowflake, AlertTriangle, ServerCrash, Coffee, Utensils, Smile,
  Package, PartyPopper, ShieldAlert, WifiOff, Sparkles, Lock, Flame,
  Volume2, Folder, Laptop, Zap, Cpu
};

function PresetCardItem({
  preset,
  isExpanded,
  onToggleExpand,
  categories,
  theme,
  lang,
  t,
  onSpeak,
  onOpenRepeat,
  repeatFeatureEnabled,
  isSystemSpeaking,
  cooldownRemaining
}) {
  const IconComponent = ICON_MAP[preset.icon] || Volume2;
  const title = preset.title || preset.title_ar || preset.title_en || preset.id;
  const text = preset.text || preset.text_ar || preset.text_en || '';

  // Find category badge
  let categoryBadge = t.uncategorized;
  if (preset.category_id && preset.category_id !== 'uncategorized') {
    const matchedCat = categories.find(c => c.id === preset.category_id || c.name_ar === preset.category);
    if (matchedCat) {
      categoryBadge = lang === 'en' ? (matchedCat.name_en || matchedCat.name_ar) : (matchedCat.name_ar || matchedCat.name_en);
    } else if (preset.category) {
      categoryBadge = preset.category;
    }
  }

  // Ref to measure if text exceeds 2 lines in collapsed mode
  const measureRef = useRef(null);
  const [canExpand, setCanExpand] = useState(() => (text || '').length > 60 || (text || '').includes('\n'));

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const checkOverflow = () => {
      // scrollHeight > clientHeight + 1 detects if 2-line clamp truncates text
      const overflows = el.scrollHeight > el.clientHeight + 1;
      setCanExpand(overflows);
    };

    checkOverflow();

    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div
      className={`group relative rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 border ${
        theme === 'dark'
          ? 'bg-[#0B132B] hover:bg-[#121C33] border-[#1F3152] hover:border-[#00D2FF]/50 shadow-lg hover:shadow-[#00D2FF]/10'
          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-sky-400 shadow-sm hover:shadow-md'
      } hover:-translate-y-0.5`}
    >
      <div>
        {/* Header: Icon & Category Tag */}
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors border ${
            theme === 'dark'
              ? 'bg-[#162238] group-hover:bg-[#00D2FF]/10 border-[#1F3152] group-hover:border-[#00D2FF]/40'
              : 'bg-slate-100 group-hover:bg-sky-50 border-slate-200 group-hover:border-sky-200'
          }`}>
            <IconComponent className={`w-4 h-4 ${theme === 'dark' ? 'text-[#00D2FF]' : 'text-sky-600'}`} />
          </div>
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-xl ${
            theme === 'dark' ? 'bg-[#162238] text-slate-300' : 'bg-slate-100 text-slate-600'
          }`}>
            {categoryBadge}
          </span>
        </div>

        {/* Title with Expand Arrow Button (ONLY shown when text is actually long and truncated) */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className={`font-bold text-sm leading-snug transition-colors ${
            theme === 'dark' ? 'text-white group-hover:text-[#00D2FF]' : 'text-slate-900 group-hover:text-sky-600'
          }`}>
            {title}
          </h3>

          {canExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(preset.id);
              }}
              title={isExpanded ? t.collapsePresetText : t.expandPresetText}
              className={`p-1 rounded-xl transition-all shrink-0 hover:scale-110 active:scale-95 ${
                isExpanded
                  ? 'bg-[#00D2FF]/20 text-[#00D2FF] border border-[#00D2FF]/40'
                  : theme === 'dark'
                    ? 'bg-[#162238] hover:bg-[#1E2D4A] text-slate-400 hover:text-white border border-[#1F3152]'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200'
              }`}
            >
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Spoken Text Container with Relative Positioning for Measurement Twin */}
        <div className="relative">
          {/* Visible text */}
          <p className={`text-xs leading-relaxed transition-all ${
            isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
          } ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
          }`}>
            "{text}"
          </p>

          {/* Hidden reference measurement twin - ALWAYS line-clamp-2 to measure overflow */}
          <p
            ref={measureRef}
            aria-hidden="true"
            className="text-xs leading-relaxed line-clamp-2 absolute opacity-0 pointer-events-none -z-50 select-none inset-x-0 top-0"
          >
            "{text}"
          </p>
        </div>
      </div>

      {/* Action Buttons: Trigger Once + Auto-Repeat */}
      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={() => onSpeak(preset)}
          disabled={cooldownRemaining > 0 || isSystemSpeaking}
          className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn ${
            theme === 'dark'
              ? 'bg-[#162238] hover:bg-[#00D2FF] text-slate-200 hover:text-slate-950 border-[#1F3152] hover:border-[#00D2FF]'
              : 'bg-slate-100 hover:bg-sky-600 text-slate-700 hover:text-white border-slate-200 hover:border-sky-600'
          }`}
        >
          {isSystemSpeaking ? (
            <>
              <Activity className="w-3.5 h-3.5 animate-pulse text-rose-400" />
              <span>{t.speakingNowBtn}</span>
            </>
          ) : cooldownRemaining > 0 ? (
            <>
              <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>{cooldownRemaining}s</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" />
              <span>{t.speakButton}</span>
            </>
          )}
        </button>

        {/* Repeat Button */}
        <button
          type="button"
          onClick={() => onOpenRepeat && onOpenRepeat(preset)}
          title={repeatFeatureEnabled === false ? t.repeatDisabledByAdmin : t.repeatFeatureTitle}
          className={`py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all shrink-0 ${
            repeatFeatureEnabled === false
              ? 'opacity-40 cursor-not-allowed bg-slate-800/40 border-slate-700/50 text-slate-500'
              : theme === 'dark'
                ? 'bg-[#162238] hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 border-[#1F3152] hover:border-purple-400/50'
                : 'bg-slate-100 hover:bg-purple-100 text-purple-700 hover:text-purple-900 border-slate-200 hover:border-purple-300'
          }`}
        >
          {repeatFeatureEnabled === false ? (
            <Lock className="w-3.5 h-3.5" />
          ) : (
            <Repeat className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{t.repeatBtn}</span>
        </button>
      </div>
    </div>
  );
}

export default function PublicWorkspace({ extraAdminContent = null, isEmbedded = false }) {
  const { theme, toggleTheme, lang, toggleLang, t } = useThemeLang();

  const [categories, setCategories] = useState([]);
  const [presets, setPresets] = useState([]);
  const [expandedPresetIds, setExpandedPresetIds] = useState(new Set());

  const togglePresetExpand = (presetId) => {
    setExpandedPresetIds((prev) => {
      const next = new Set(prev);
      if (next.has(presetId)) {
        next.delete(presetId);
      } else {
        next.add(presetId);
      }
      return next;
    });
  };
  const [systemState, setSystemState] = useState({
    status: 'ready',
    current_item: null,
    queue_length: 0,
    server_volume: 85,
    cooldown_remaining: 0,
    audio_device: {
      device_name: 'HD-Audio Generic (ALC256 Analog)',
      card_type: 'internal',
      is_bluetooth: false,
      is_external_speaker: false,
      label_ar: 'Ready',
      label_en: 'Device Audio Ready',
      card_details: 'Internal Audio Device'
    },
    settings: { spam_cooldown_enabled: true, cooldown_seconds: 15 },
    active_repeat: null,
    repeat_feature_enabled: true
  });

  // Auto-Repeat Modal & State
  const [isRepeatModalOpen, setIsRepeatModalOpen] = useState(false);
  const [repeatTarget, setRepeatTarget] = useState(null); // { preset_id, title, text, lang }
  const [repeatMode, setRepeatMode] = useState('count'); // 'count' | 'infinite' | 'duration'
  const [repeatCount, setRepeatCount] = useState(3);
  const [repeatDurationMinutes, setRepeatDurationMinutes] = useState(5);
  const [repeatIntervalSeconds, setRepeatIntervalSeconds] = useState(15);
  const [isSubmittingRepeat, setIsSubmittingRepeat] = useState(false);

  const handleOpenRepeatForPreset = (preset) => {
    const title = preset.title || preset.title_ar || preset.title_en || preset.id;
    const text = preset.text || preset.text_ar || preset.text_en || '';
    setRepeatTarget({
      preset_id: preset.id,
      title,
      text,
      lang: null
    });
    setIsRepeatModalOpen(true);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);

  // Custom Speech Input Box
  const [customText, setCustomText] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [isTashkeelLoading, setIsTashkeelLoading] = useState(false);
  const textareaRef = useRef(null);

  // Audio Device & Volume Control Modal
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(85);
  const [isReconnectingSpeaker, setIsReconnectingSpeaker] = useState(false);

  // Feedback & Cooldown State
  const [toast, setToast] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Initialize data, auto-reconnecting WebSocket, and fallback polling
  useEffect(() => {
    fetchCategories();
    fetchPresets();
    fetchStatus();

    // Fallback polling every 1500ms to guarantee zero UI lag and resilient sync across clients
    const statusPollTimer = setInterval(() => {
      fetchStatus();
    }, 1500);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws = null;
    let pingInterval = null;
    let reconnectTimeout = null;
    let isDisposed = false;

    const connectWebSocket = () => {
      if (isDisposed) return;
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 15000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.status) {
              setSystemState(data);
              if (data.cooldown_remaining !== undefined && data.cooldown_remaining > 0) {
                setCooldownRemaining(data.cooldown_remaining);
              }
            }
          } catch {
            // Ignore non-json socket packets
          }
        };

        ws.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connectWebSocket, 1500);
          }
        };

        ws.onerror = () => {
          if (ws) {
            try { ws.close(); } catch {}
          }
        };
      } catch {
        if (!isDisposed) {
          reconnectTimeout = setTimeout(connectWebSocket, 2000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isDisposed = true;
      if (statusPollTimer) clearInterval(statusPollTimer);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingInterval) clearInterval(pingInterval);
      if (ws) {
        try { ws.close(); } catch {}
      }
    };
  }, []);

  // Cooldown countdown interval
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAudioModalOpen(false);
        setIsCategoryModalOpen(false);
        setIsRepeatModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleStopAudio = async () => {
    // Optimistically update to ready immediately
    setSystemState((prev) => ({
      ...prev,
      status: 'ready',
      current_item: null,
      active_repeat: null
    }));
    try {
      const res = await fetch('/api/audio/stop', { method: 'POST' });
      if (res.ok) {
        showToast(t.audioStoppedMsg || 'Audio stopped immediately ⏹️');
      } else if (res.status === 403) {
        fetchStatus();
        showToast(t.stopAudioAdminVoiceDenied || 'Admin live voice broadcast cannot be stopped by members', 'error');
      } else {
        fetchStatus();
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || t.errorNetwork, 'error');
      }
    } catch {
      fetchStatus();
      showToast(t.errorNetwork, 'error');
    }
  };

  const handleStartRepeat = async () => {
    if (!repeatTarget) return;
    setIsSubmittingRepeat(true);
    try {
      const payload = {
        preset_id: repeatTarget.preset_id || null,
        title: repeatTarget.title,
        text: repeatTarget.text,
        lang: repeatTarget.lang || null,
        mode: repeatMode,
        count: parseInt(repeatCount, 10) || 3,
        duration_minutes: parseFloat(repeatDurationMinutes) || 5.0,
        interval_seconds: parseInt(repeatIntervalSeconds, 10) || 15
      };

      const res = await fetch('/api/speak/repeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(t.repeatSuccessToast, 'success');
        setIsRepeatModalOpen(false);
        fetchStatus();
      } else {
        showToast(data.detail || t.errorGeneric, 'error');
      }
    } catch {
      showToast(t.errorNetwork, 'error');
    } finally {
      setIsSubmittingRepeat(false);
    }
  };

  const handleStopRepeat = async () => {
    try {
      const res = await fetch('/api/repeat/stop', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(t.repeatStoppedToast, 'info');
        setSystemState(prev => ({ ...prev, active_repeat: null }));
        fetchStatus();
      }
    } catch {
      showToast(t.errorNetwork, 'error');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets');
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setSystemState(data);
        if (data.cooldown_remaining !== undefined && data.cooldown_remaining > 0) {
          setCooldownRemaining(data.cooldown_remaining);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Adjust output volume directly
  const handleSetVolume = async (newVolume) => {
    const vol = Math.max(0, Math.min(150, Number(newVolume)));
    setSystemState(prev => ({ ...prev, server_volume: vol }));
    try {
      await fetch('/api/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: vol })
      });
    } catch (err) {
      console.error("Error setting volume:", err);
    }
  };

  // Toggle Mute
  const handleToggleMute = async () => {
    if (isMuted) {
      const restoreVol = previousVolume > 0 ? previousVolume : 60;
      setIsMuted(false);
      await handleSetVolume(restoreVol);
    } else {
      setPreviousVolume(systemState.server_volume);
      setIsMuted(true);
      await handleSetVolume(0);
    }
  };

  // Trigger announcement preset
  const handleSpeakPreset = async (preset) => {
    if (systemState.status === 'speaking') {
      showToast(t.statusSpeaking, 'warning');
      return;
    }
    if (cooldownRemaining > 0) {
      showToast(t.cooldownWarning.replace('{seconds}', cooldownRemaining), 'warning');
      return;
    }

    const title = preset.title || preset.title_ar || preset.title_en || preset.id;

    // Optimistically update status to speaking immediately
    setSystemState((prev) => ({
      ...prev,
      status: 'speaking',
      current_item: { title, id: preset.id }
    }));

    try {
      const res = await fetch(`/api/speak/preset/${preset.id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(t.speakSuccess.replace('{title}', title), 'success');
        if (systemState.settings?.spam_cooldown_enabled) {
          setCooldownRemaining(systemState.settings.cooldown_seconds || 15);
        }
      } else {
        fetchStatus();
        if (res.status === 429) {
          showToast(data.detail, 'warning');
        } else {
          showToast(data.detail || t.errorGeneric, 'error');
        }
      }
    } catch {
      fetchStatus();
      showToast(t.errorNetwork, 'error');
    }
  };

  // Diacritize Arabic text
  const handleTashkeel = async () => {
    if (!customText.trim() || isTashkeelLoading) return;
    setIsTashkeelLoading(true);
    try {
      const res = await fetch('/api/tashkeel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: customText })
      });
      const data = await res.json();
      if (res.ok && data.diacritized) {
        setCustomText(data.diacritized);
        showToast(t.tashkeelSuccess, 'success');
      }
    } catch {
      showToast(t.errorNetwork, 'error');
    } finally {
      setIsTashkeelLoading(false);
    }
  };

  // Submit free text speech
  const handleCustomSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!customText.trim()) return;

    if (systemState.status === 'speaking') {
      showToast(t.statusSpeaking, 'warning');
      return;
    }

    if (cooldownRemaining > 0) {
      showToast(t.cooldownWarning.replace('{seconds}', cooldownRemaining), 'warning');
      return;
    }

    setIsSubmittingCustom(true);
    // Optimistically update status to speaking immediately
    setSystemState((prev) => ({
      ...prev,
      status: 'speaking',
      current_item: { title: customTitle.trim() || t.freeSpeechTitle, text: customText.trim() }
    }));

    try {
      const res = await fetch('/api/speak/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim() || t.freeSpeechTitle,
          text: customText.trim(),
          lang: lang
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(t.customSuccess, 'success');
        // Keep customText in textarea so the message does not disappear as requested by user
        if (systemState.settings?.spam_cooldown_enabled) {
          setCooldownRemaining(systemState.settings.cooldown_seconds || 15);
        }
      } else {
        fetchStatus();
        if (res.status === 429) {
          showToast(data.detail, 'warning');
        } else {
          showToast(data.detail || t.errorGeneric, 'error');
        }
      }
    } catch {
      fetchStatus();
      showToast(t.errorNetwork, 'error');
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  // Remote Bluetooth Speaker Reconnect Handler (Image 4 fix)
  const handleReconnectSpeaker = async () => {
    setIsReconnectingSpeaker(true);
    try {
      const res = await fetch('/api/bluetooth/reconnect', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || t.reconnectSuccess, 'success');
        if (data.device) {
          setSystemState((prev) => ({ ...prev, audio_device: data.device }));
        }
      } else {
        showToast(data.message || t.reconnectFailed, 'warning');
      }
    } catch {
      showToast(t.errorNetwork, 'error');
    } finally {
      setIsReconnectingSpeaker(false);
    }
  };

  // Insert Quick Snippet at current textarea cursor position
  const handleInsertSnippet = (snippetText) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setCustomText((prev) => (prev ? `${prev} ${snippetText}` : snippetText));
      return;
    }

    const start = textarea.selectionStart || customText.length;
    const end = textarea.selectionEnd || customText.length;
    const before = customText.substring(0, start);
    const after = customText.substring(end);

    const needsSpaceBefore = before.length > 0 && !before.endsWith(' ');
    const inserted = (needsSpaceBefore ? ' ' : '') + snippetText + ' ';
    const updated = before + inserted + after;

    setCustomText(updated);
    setTimeout(() => {
      textarea.focus();
      const newCursor = start + inserted.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  // Filter presets by search and category
  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        p.category_id === selectedCategory ||
        p.category === selectedCategory ||
        (selectedCategory === 'uncategorized' && (!p.category_id || p.category_id === 'uncategorized'));

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const title = (p.title || p.title_ar || p.title_en || '').toLowerCase();
      const text = (p.text || p.text_ar || p.text_en || '').toLowerCase();

      return matchesCategory && (title.includes(q) || text.includes(q));
    });
  }, [presets, selectedCategory, searchQuery]);

  const areAllPresetsExpanded = filteredPresets.length > 0 && filteredPresets.every(p => expandedPresetIds.has(p.id));

  const toggleAllPresetsExpand = () => {
    if (areAllPresetsExpanded) {
      setExpandedPresetIds(new Set());
    } else {
      setExpandedPresetIds(new Set(filteredPresets.map(p => p.id)));
    }
  };

  // Determine current status label
  const isSpeakerConnected = Boolean(systemState.audio_device?.is_external_speaker);

  const getStatusLabel = () => {
    if (systemState.status === 'speaking') return t.statusSpeaking;
    if (systemState.status === 'queued') return `${t.statusQueued} (${systemState.queue_length})`;
    if (isSpeakerConnected) return t.speakerConnected || t.statusSpeakerReady;
    return t.speakerDisconnected || t.statusDeviceReady;
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#070C1B] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'} pb-16 transition-colors duration-200`}>
      {/* Toast Alert - Centered horizontally across all devices and RTL/LTR */}
      {toast && (
        <div className="fixed top-5 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
          <div
            className="pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md border animate-fadeIn text-sm font-semibold transition-all max-w-lg text-center"
            style={{
              backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : toast.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(239, 68, 68, 0.95)',
              borderColor: toast.type === 'success' ? '#10B981' : toast.type === 'warning' ? '#F59E0B' : '#EF4444',
              color: '#FFFFFF'
            }}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      {!isEmbedded && (
        <header className={`sticky top-0 z-40 backdrop-blur-lg border-b px-4 lg:px-8 py-3.5 shadow-xl transition-colors duration-200 ${
          theme === 'dark' ? 'bg-[#0B132B]/90 border-[#1F3152]' : 'bg-white/90 border-slate-200 shadow-slate-100'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center p-1.5 bg-white border border-slate-200/60 shadow-sm transition-all">
                <img src="/logo.png" alt="Kernel Ping Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className={`text-xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t.appName}
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.appSubtitle}
                </p>
              </div>
            </div>

            {/* Header Controls: Status Pill, Member Volume, Cooldown, Theme, Language */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              
              {/* Clickable Live Audio Status Pill (Image 4 Fix) */}
              <button
                onClick={() => setIsAudioModalOpen(true)}
                title={t.deviceAudioSettingsTitle}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${
                  isSpeakerConnected
                    ? theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : theme === 'dark' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {systemState.status === 'speaking' ? (
                  <>
                    <div className="flex items-end gap-1 h-4">
                      <span className="w-1 bg-[#00D2FF] rounded-full animate-sound-wave" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 bg-[#00D2FF] rounded-full animate-sound-wave" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 bg-[#00D2FF] rounded-full animate-sound-wave" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs font-bold text-[#00D2FF]">{t.statusSpeaking}</span>
                  </>
                ) : systemState.status === 'queued' ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs font-bold text-amber-500">
                      {t.statusQueued} ({systemState.queue_length})
                    </span>
                  </>
                ) : isSpeakerConnected ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
                    <Speaker className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold">
                      {getStatusLabel()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]" />
                    <Laptop className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold">
                      {getStatusLabel()}
                    </span>
                  </>
                )}
              </button>

              {/* Immediate Stop Audio Button */}
              <button
                type="button"
                onClick={handleStopAudio}
                title={t.stopAudioBtn}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  systemState.status === 'speaking' ? 'animate-pulse ring-2 ring-rose-400/50' : ''
                }`}
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{t.stopAudioBtn}</span>
              </button>


              {/* Clickable Member Volume Badge */}
              <button
                onClick={() => setIsAudioModalOpen(true)}
                title={t.volume}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono cursor-pointer transition-all hover:scale-105 ${
                  theme === 'dark' 
                    ? 'bg-[#121C33] border-[#1F3152] text-slate-300 hover:border-[#00D2FF]/60' 
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-sky-400'
                }`}
              >
                {systemState.server_volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <Volume2 className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-[#00D2FF]' : 'text-sky-600'}`} />
                )}
                <span className="font-bold">{systemState.server_volume}%</span>
              </button>

              {/* Universal Cooldown Timer Badge */}
              {cooldownRemaining > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 font-mono font-bold animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{cooldownRemaining}s</span>
                </div>
              )}

              {/* Theme Switcher Button */}
              <button
                onClick={toggleTheme}
                title={t.themeToggle}
                className={`p-2 rounded-xl border transition-all ${
                  theme === 'dark' 
                    ? 'bg-[#121C33] border-[#1F3152] text-amber-400 hover:bg-[#1C2A47]' 
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Language Switcher Button */}
              <button
                onClick={toggleLang}
                title="Change Language"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-[#121C33] border-[#1F3152] text-[#00D2FF] hover:bg-[#1C2A47]'
                    : 'bg-slate-100 border-slate-200 text-sky-700 hover:bg-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{t.langToggle}</span>
              </button>

            </div>
          </div>
        </header>
      )}

      {/* Active Repeat Live Banner */}
      {systemState.active_repeat && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-1">
          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 border shadow-xl bg-gradient-to-r from-purple-950/90 via-[#0E172E] to-purple-950/90 border-purple-500/50 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
                <Repeat className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                    {t.repeatActiveBanner}
                  </span>
                  <span className="text-xs text-purple-300 font-bold">
                    {systemState.active_repeat.title}
                  </span>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                  <span>
                    {systemState.active_repeat.mode === 'count'
                      ? t.repeatCountProgress
                          .replace('{current}', systemState.active_repeat.count_current || 1)
                          .replace('{total}', systemState.active_repeat.count_total || '?')
                      : systemState.active_repeat.mode === 'duration'
                        ? t.repeatDurationProgress
                            .replace('{duration}', Math.round((systemState.active_repeat.duration_seconds || 0) / 60))
                            .replace('{elapsed}', `${Math.floor((systemState.active_repeat.elapsed_seconds || 0) / 60)}:${String((systemState.active_repeat.elapsed_seconds || 0) % 60).padStart(2, '0')}`)
                        : t.repeatInfiniteProgress
                            .replace('{current}', systemState.active_repeat.count_current || 1)
                    }
                  </span>
                  <span className="text-purple-400">•</span>
                  <span className="font-mono text-purple-200 font-bold">
                    {systemState.active_repeat.status === 'speaking'
                      ? t.speakingNowBtn
                      : t.repeatNextIn.replace('{seconds}', systemState.active_repeat.next_repeat_in ?? systemState.active_repeat.interval_seconds)
                    }
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStopRepeat}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{t.repeatStopBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Auto-Repeat Modal Dialog */}
      {isRepeatModalOpen && repeatTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-7 border shadow-2xl transition-all ${
            theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{t.repeatModalTitle}</h3>
                  <p className="text-xs opacity-70 line-clamp-1">
                    {repeatTarget.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRepeatModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-800/40 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Lock Warning */}
            {systemState.repeat_feature_enabled === false ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3 mb-5">
                <Lock className="w-5 h-5 shrink-0" />
                <span>{t.repeatDisabledByAdmin}</span>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Spoken Text Preview */}
                <div className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                  theme === 'dark' ? 'bg-[#121C33] border-[#1F3152] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <span className="font-bold text-[11px] block mb-1 text-[#00D2FF]">
                    {repeatTarget.title}
                  </span>
                  "{repeatTarget.text}"
                </div>

                {/* Repeat Mode Selector */}
                <div>
                  <label className="block text-xs font-bold mb-2">
                    {t.repeatModeLabel}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRepeatMode('count')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                        repeatMode === 'count'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                          : theme === 'dark'
                            ? 'bg-[#162238] border-[#1F3152] text-slate-300 hover:bg-[#1E2D4A]'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <ListOrdered className="w-4 h-4" />
                      <span className="text-[11px] text-center leading-tight">{t.repeatModeCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRepeatMode('infinite')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                        repeatMode === 'infinite'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                          : theme === 'dark'
                            ? 'bg-[#162238] border-[#1F3152] text-slate-300 hover:bg-[#1E2D4A]'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Infinity className="w-4 h-4" />
                      <span className="text-[11px] text-center leading-tight">{t.repeatModeInfinite}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRepeatMode('duration')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                        repeatMode === 'duration'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                          : theme === 'dark'
                            ? 'bg-[#162238] border-[#1F3152] text-slate-300 hover:bg-[#1E2D4A]'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Timer className="w-4 h-4" />
                      <span className="text-[11px] text-center leading-tight">{t.repeatModeDuration}</span>
                    </button>
                  </div>
                </div>

                {/* Mode Dependent Option: Count */}
                {repeatMode === 'count' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">{t.repeatCountLabel}</span>
                      <span className="font-mono text-[#00D2FF] font-bold">{repeatCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[2, 3, 5, 10, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setRepeatCount(num)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                            repeatCount === num
                              ? 'bg-purple-600 text-white border-purple-400'
                              : theme === 'dark'
                                ? 'bg-[#162238] border-[#1F3152] text-slate-300'
                                : 'bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={repeatCount}
                        onChange={(e) => setRepeatCount(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                        className={`w-20 px-2 py-1 rounded-xl text-xs font-bold border font-mono ${
                          theme === 'dark' ? 'bg-[#162238] border-[#1F3152] text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Mode Dependent Option: Duration */}
                {repeatMode === 'duration' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">{t.repeatDurationLabel}</span>
                      <span className="font-mono text-[#00D2FF] font-bold">{repeatDurationMinutes} {t.minutesUnit}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[5, 10, 15, 30, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setRepeatDurationMinutes(mins)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                            repeatDurationMinutes === mins
                              ? 'bg-purple-600 text-white border-purple-400'
                              : theme === 'dark'
                                ? 'bg-[#162238] border-[#1F3152] text-slate-300'
                                : 'bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {mins} {t.minutesUnit}
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={repeatDurationMinutes}
                        onChange={(e) => setRepeatDurationMinutes(Math.max(1, Math.min(180, parseInt(e.target.value, 10) || 1)))}
                        className={`w-20 px-2 py-1 rounded-xl text-xs font-bold border font-mono ${
                          theme === 'dark' ? 'bg-[#162238] border-[#1F3152] text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Interval Between Repeats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold">{t.repeatIntervalLabel}</span>
                    <span className="font-mono text-[#00D2FF] font-bold">{repeatIntervalSeconds} {t.secondsUnit}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {[5, 10, 15, 30, 60].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setRepeatIntervalSeconds(sec)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                          repeatIntervalSeconds === sec
                            ? 'bg-[#00D2FF] text-slate-950 border-[#00D2FF]'
                            : theme === 'dark'
                              ? 'bg-[#162238] border-[#1F3152] text-slate-300'
                              : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="120"
                    value={repeatIntervalSeconds}
                    onChange={(e) => setRepeatIntervalSeconds(parseInt(e.target.value, 10))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-3 border-t border-slate-700/30 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRepeatModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    {t.closeBtn || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartRepeat}
                    disabled={isSubmittingRepeat}
                    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Repeat className={`w-4 h-4 ${isSubmittingRepeat ? 'animate-spin' : ''}`} />
                    <span>{t.repeatStartBtn}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Device Audio Settings & Sound Card Modal */}
      {isAudioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-7 border shadow-2xl transition-all ${
            theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Speaker className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{t.deviceAudioSettingsTitle}</h3>
                  <p className="text-xs opacity-70">
                    {t.audioDestinationNotice}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsAudioModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-800/40 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Connected Sound Card Info Box */}
            <div className={`p-4 rounded-2xl border mb-6 ${
              theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-cyan-400">
                <Cpu className="w-4 h-4" />
                <span>{t.activeSoundCardLabel}</span>
              </div>
              <p className="font-mono text-sm font-black text-cyan-300 break-words mb-2">
                {systemState.audio_device?.device_name || 'HD-Audio Generic (ALC256 Analog)'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                  isSpeakerConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {isSpeakerConnected ? t.soundCardBluetooth : t.soundCardInternal}
                </span>
                <span className="text-[11px] opacity-75">
                  {t.audioDestinationNotice}
                </span>
              </div>

              {/* Internal speaker notice when speaker is disconnected */}
              {!isSpeakerConnected && (
                <div className="mt-3.5 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <p className="text-[11px] leading-relaxed">{t.speakerNoticeInternal}</p>
                </div>
              )}
            </div>

            {/* Interactive Volume Slider (Synchronized in LTR) */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  {t.volumeSliderLabel}
                </label>
                <span className="font-mono text-cyan-400 font-extrabold text-lg">
                  {systemState.server_volume}%
                </span>
              </div>

              <div dir="ltr" className="w-full space-y-2">
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={systemState.server_volume}
                  onChange={(e) => handleSetVolume(e.target.value)}
                  style={{
                    background: `linear-gradient(to right, #00D2FF 0%, #00D2FF ${Math.min(100, Math.max(0, (systemState.server_volume / 150) * 100))}%, ${theme === 'dark' ? '#1E293B' : '#E2E8F0'} ${Math.min(100, Math.max(0, (systemState.server_volume / 150) * 100))}%, ${theme === 'dark' ? '#1E293B' : '#E2E8F0'} 100%)`
                  }}
                  className="w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
                />

                {/* Quick Volume Preset Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[0, 25, 50, 75, 100, 125, 150].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleSetVolume(v)}
                        className={`px-2 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                          systemState.server_volume === v
                            ? 'bg-[#00D2FF] text-slate-950 border-[#00D2FF] shadow-sm'
                            : theme === 'dark' ? 'bg-[#121C33] border-[#1F3152] text-slate-300 hover:bg-[#1C2A47]' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                      isMuted || systemState.server_volume === 0
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : theme === 'dark' ? 'bg-[#121C33] border-[#1F3152] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {isMuted || systemState.server_volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isMuted || systemState.server_volume === 0 ? t.unmuteBtn : t.muteBtn}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAudioModalOpen(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all"
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-6 space-y-8">
        
        {/* Optional Extra Admin Live Broadcast Studio */}
        {extraAdminContent}

        {/* Search & Dynamic Category Filter Bar */}
        <section className={`p-4 rounded-3xl border shadow-xl flex flex-col gap-3.5 transition-colors duration-200 ${
          theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 shadow-slate-100'
        }`}>
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center w-full">
            {/* Instant Search Bar */}
            <div className="relative w-full sm:w-96">
              <Search className={`w-4 h-4 absolute ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-slate-400`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className={`w-full border rounded-2xl ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-xs transition-all focus:outline-none ${
                  theme === 'dark'
                    ? 'bg-[#070C1B] border-[#1F3152] text-white placeholder-slate-500 focus:border-[#00D2FF]'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600`}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Toggle Expand / Collapse Category Pills Button (Arrow only, no text) */}
            <button
              type="button"
              onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
              title={isCategoriesExpanded ? t.collapseCategories : t.expandCategories}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                theme === 'dark'
                  ? 'bg-[#121C33] border-[#1F3152] text-slate-300 hover:text-white hover:bg-[#1C2A47]'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-200'
              }`}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCategoriesExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Dynamic Category Filter Pills: Folds completely or unfolds smoothly */}
          <div className={`flex flex-wrap items-center gap-2 transition-all duration-300 ${
            isCategoriesExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'
          }`}>
            {/* All Category */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? theme === 'dark'
                    ? 'bg-[#00D2FF] text-slate-950 shadow-md shadow-[#00D2FF]/20 font-black'
                    : 'bg-sky-600 text-white shadow-md shadow-sky-600/20 font-black'
                  : theme === 'dark'
                    ? 'bg-[#121C33] text-slate-300 hover:bg-[#1C2A47]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.allCategories} ({presets.length})
            </button>

            {/* Dynamic Categories (Uncategorized category is hidden from public workspace) */}
            {categories
              .filter((cat) => cat.id !== 'uncategorized')
              .map((cat) => {
                const count = presets.filter(p => 
                  p.category_id === cat.id || 
                  p.category === cat.name_ar
                ).length;
                const isSelected = selectedCategory === cat.id;
                const catName = lang === 'en' ? (cat.name_en || cat.name_ar) : (cat.name_ar || cat.name_en);

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? theme === 'dark'
                          ? 'bg-[#00D2FF] text-slate-950 shadow-md shadow-[#00D2FF]/20 font-black'
                          : 'bg-sky-600 text-white shadow-md shadow-sky-600/20 font-black'
                        : theme === 'dark'
                          ? 'bg-[#121C33] text-slate-300 hover:bg-[#1C2A47]'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{catName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected 
                        ? 'bg-black/20 text-slate-950' 
                        : theme === 'dark' ? 'bg-[#1F3152] text-slate-400' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
          </div>
        </section>

        {/* Presets Grid Section */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${theme === 'dark' ? 'text-[#00D2FF]' : 'text-sky-600'}`} />
                <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t.quickAlertsTitle}
                </h2>
              </div>
              <p className={`text-xs mt-1 flex items-center gap-1.5 font-normal ${
                theme === 'dark' ? 'text-sky-300/80' : 'text-sky-700'
              }`}>
                <Zap className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                <span>{t.presetsCachedNote}</span>
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={toggleAllPresetsExpand}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold border transition-all duration-150 shadow-sm active:scale-95 ${
                  theme === 'dark'
                    ? areAllPresetsExpanded
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25'
                      : 'bg-[#121C33] hover:bg-[#1A2847] border-[#1F3152] text-slate-300 hover:text-white'
                    : areAllPresetsExpanded
                      ? 'bg-sky-100 border-sky-300 text-sky-800 hover:bg-sky-200'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                title={areAllPresetsExpanded ? t.collapseAllPresets : t.expandAllPresets}
              >
                {areAllPresetsExpanded ? (
                  <>
                    <ChevronsUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t.collapseAllPresets}</span>
                  </>
                ) : (
                  <>
                    <ChevronsDown className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t.expandAllPresets}</span>
                  </>
                )}
              </button>

              <span className={`text-xs font-mono shrink-0 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {filteredPresets.length} {t.presetsCount}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredPresets.map((preset) => (
              <PresetCardItem
                key={preset.id}
                preset={preset}
                isExpanded={expandedPresetIds.has(preset.id)}
                onToggleExpand={togglePresetExpand}
                categories={categories}
                theme={theme}
                lang={lang}
                t={t}
                onSpeak={handleSpeakPreset}
                onOpenRepeat={handleOpenRepeatForPreset}
                repeatFeatureEnabled={systemState.repeat_feature_enabled !== false}
                isSystemSpeaking={systemState.status === 'speaking'}
                cooldownRemaining={cooldownRemaining}
              />
            ))}
          </div>
        </section>

        {/* Side-by-Side: Quick Templates Window & Free Speech Studio Window */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* Window 1: Quick Templates */}
          <div className="flex flex-col h-full space-y-2">
            <div className={`px-3.5 py-1.5 rounded-2xl border flex items-center gap-2 text-[11px] font-medium shadow-sm ${
              theme === 'dark' ? 'bg-[#0E1726]/90 border-[#1F3152] text-cyan-300' : 'bg-sky-50 border-sky-200 text-sky-800'
            }`}>
              <Globe className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
              <span>{t.cloudAudioNotice}</span>
            </div>
            <RoutineActions
              onRoutineSpoke={(msg, type) => {
                showToast(msg, type || 'success');
                if (type !== 'error') {
                  if (systemState.settings?.spam_cooldown_enabled) {
                    setCooldownRemaining(systemState.settings.cooldown_seconds || 15);
                  }
                }
              }}
              onStartSpeaking={() => {
                setSystemState((prev) => ({
                  ...prev,
                  status: 'speaking'
                }));
              }}
              cooldownRemaining={cooldownRemaining}
              isSpeaking={systemState.status === 'speaking'}
            />
          </div>

          {/* Window 2: Free Speech Box with AI Tashkeel and Quick Snippets */}
          <div className="flex flex-col h-full space-y-2">
            <div className={`px-3.5 py-1.5 rounded-2xl border flex items-center gap-2 text-[11px] font-medium shadow-sm ${
              theme === 'dark' ? 'bg-[#0E1726]/90 border-[#1F3152] text-cyan-300' : 'bg-sky-50 border-sky-200 text-sky-800'
            }`}>
              <Globe className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
              <span>{t.cloudAudioNotice}</span>
            </div>
            <section className={`border rounded-3xl p-5 sm:p-6 shadow-xl transition-colors duration-200 h-full flex flex-col justify-between ${
              theme === 'dark' ? 'bg-[#0B132B]/85 border-[#1F3152]' : 'bg-white border-slate-200 shadow-slate-100'
            }`}>
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-700/30 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${
                    theme === 'dark' ? 'bg-[#00D2FF]/10 border-[#00D2FF]/30 text-[#00D2FF]' : 'bg-sky-50 border-sky-200 text-sky-600'
                  }`}>
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className={`font-bold text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {t.freeSpeechTitle}
                    </h2>
                    <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t.freeSpeechSubtitle}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-mono font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {customText.length}/400
                </span>
              </div>

              {/* Quick Snippets Chips */}
              <QuickSnippets onSelectSnippet={handleInsertSnippet} isSpeaking={systemState.status === 'speaking'} />

              <form onSubmit={handleCustomSubmit} className="space-y-3.5 mt-2">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    rows={4}
                    maxLength={400}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        if (customText.trim() && !isSubmittingCustom && cooldownRemaining <= 0 && systemState.status !== 'speaking') {
                          handleCustomSubmit(e);
                        }
                      }
                    }}
                    placeholder={t.freeSpeechPlaceholder}
                    className={`w-full border rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed transition-all resize-none focus:outline-none ${
                      theme === 'dark'
                        ? 'bg-[#070C1B] border-[#1F3152] text-white placeholder-slate-500 focus:border-[#00D2FF]'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                    }`}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* AI Tashkeel & Shortcut */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTashkeel}
                      disabled={isTashkeelLoading || !customText.trim()}
                      className={`py-1.5 px-3 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        theme === 'dark'
                          ? 'bg-[#162238] hover:bg-[#1F3152] text-[#00D2FF] border-[#1F3152] hover:border-[#00D2FF]/40'
                          : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
                      }`}
                      title={t.tashkeelBtn}
                    >
                      <Sparkles className={`w-3 h-3 ${isTashkeelLoading ? 'animate-spin' : ''}`} />
                      <span>{isTashkeelLoading ? t.tashkeelProcessing : t.tashkeelBtn}</span>
                    </button>

                    <span className={`text-[10px] font-mono hidden sm:inline-block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {t.ctrlEnterHint}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Repeat Button for Custom Speech */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!customText.trim()) return;
                        setRepeatTarget({
                          title: customTitle.trim() || t.freeSpeechTitle,
                          text: customText.trim(),
                          preset_id: null
                        });
                        setIsRepeatModalOpen(true);
                      }}
                      disabled={!customText.trim() || systemState.repeat_feature_enabled === false}
                      className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                        systemState.repeat_feature_enabled === false || !customText.trim()
                          ? 'opacity-40 cursor-not-allowed bg-slate-800/40 border-slate-700/50 text-slate-500'
                          : theme === 'dark'
                            ? 'bg-[#162238] hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 border-[#1F3152] hover:border-purple-400/50'
                            : 'bg-slate-100 hover:bg-purple-100 text-purple-700 hover:text-purple-900 border-slate-200 hover:border-purple-300'
                      }`}
                      title={systemState.repeat_feature_enabled === false ? t.repeatDisabledByAdmin : t.repeatFeatureTitle}
                    >
                      {systemState.repeat_feature_enabled === false ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Repeat className="w-3.5 h-3.5" />
                      )}
                      <span>{t.repeatFeatureTitle}</span>
                    </button>

                    {/* Submit Button with Active Cooldown & Speaking Guard */}
                    <button
                      type="submit"
                      disabled={isSubmittingCustom || !customText.trim() || cooldownRemaining > 0 || systemState.status === 'speaking'}
                      className={`py-2 px-5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                        systemState.status === 'speaking' || cooldownRemaining > 0
                          ? 'bg-slate-800 text-amber-400 border border-amber-500/40 opacity-80 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:from-[#33DCFF] hover:to-blue-500 text-slate-950 shadow-[#00D2FF]/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95'
                      }`}
                    >
                      {systemState.status === 'speaking' ? (
                        <>
                          <Activity className="w-3.5 h-3.5 animate-pulse text-rose-400" />
                          <span>{t.speakingNowBtn}</span>
                        </>
                      ) : cooldownRemaining > 0 ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <span>{t.cooldownWaitBtn.replace('{seconds}', cooldownRemaining)}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSubmittingCustom ? t.speakingSubmitting : t.speakNowButton}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      </main>

      {/* Public Footer */}
      {!isEmbedded && (
        <footer className={`mt-14 text-center text-xs border-t pt-6 transition-colors duration-200 ${
          theme === 'dark' ? 'text-slate-500 border-[#1F3152]/40' : 'text-slate-400 border-slate-200'
        }`}>
          <p>{t.footerText}</p>
        </footer>
      )}
    </div>
  );
}
