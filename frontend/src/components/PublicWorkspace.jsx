import React, { useState, useEffect, useMemo } from 'react';
import {
  Volume2, VolumeX, Mic, Bell, Users, Calendar, Code, RotateCcw,
  PhoneCall, Rocket, CheckCircle2, Snowflake, AlertTriangle, ServerCrash,
  Coffee, Utensils, Smile, Package, PartyPopper, ShieldAlert, WifiOff,
  Sparkles, Lock, Flame, Search, Send, Radio, Activity, Clock,
  Sun, Moon, Globe, Folder
} from 'lucide-react';
import { useThemeLang } from '../context/ThemeLanguageContext';

const ICON_MAP = {
  Users, Calendar, Code, RotateCcw, PhoneCall, Rocket, CheckCircle2,
  Snowflake, AlertTriangle, ServerCrash, Coffee, Utensils, Smile,
  Package, PartyPopper, ShieldAlert, WifiOff, Sparkles, Lock, Flame,
  Volume2, Folder
};

export default function PublicWorkspace() {
  const { theme, toggleTheme, lang, toggleLang, t } = useThemeLang();

  const [categories, setCategories] = useState([]);
  const [presets, setPresets] = useState([]);
  const [systemState, setSystemState] = useState({
    status: 'ready',
    current_item: null,
    queue_length: 0,
    server_volume: 85,
    settings: { spam_cooldown_enabled: true, cooldown_seconds: 15 }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Custom Speech Box
  const [customText, setCustomText] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [isTashkeelLoading, setIsTashkeelLoading] = useState(false);

  // Feedback & Cooldown UI
  const [toast, setToast] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Fetch initial data
  useEffect(() => {
    fetchCategories();
    fetchPresets();
    fetchStatus();

    // Setup WebSocket for real-time status updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws = null;
    let pingInterval = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.status) {
            setSystemState(data);
          }
        } catch {
          // ignore non-json
        }
      };

      ws.onopen = () => {
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 15000);
      };
    } catch (err) {
      console.error("WS error:", err);
    }

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, []);

  // Cooldown countdown timer
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSpeakPreset = async (preset) => {
    if (cooldownRemaining > 0) {
      showToast(t.cooldownWarning.replace('{seconds}', cooldownRemaining), 'warning');
      return;
    }

    const title = preset.title || preset.title_ar || preset.title_en || preset.id;

    try {
      const res = await fetch(`/api/speak/preset/${preset.id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(t.speakSuccess.replace('{title}', title), 'success');
        if (systemState.settings?.spam_cooldown_enabled) {
          setCooldownRemaining(systemState.settings.cooldown_seconds || 15);
        }
      } else if (res.status === 429) {
        showToast(data.detail, 'warning');
      } else {
        showToast(data.detail || t.errorGeneric, 'error');
      }
    } catch {
      showToast(t.errorNetwork, 'error');
    }
  };

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

  const handleCustomSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!customText.trim()) return;

    if (cooldownRemaining > 0) {
      showToast(t.cooldownWarning.replace('{seconds}', cooldownRemaining), 'warning');
      return;
    }

    setIsSubmittingCustom(true);
    try {
      const res = await fetch('/api/speak/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim() || (lang === 'en' ? 'Team Announcement' : 'نداء حر من الفريق'),
          text: customText.trim(),
          lang: lang
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(t.customSuccess, 'success');
        setCustomText('');
        setCustomTitle('');
        if (systemState.settings?.spam_cooldown_enabled) {
          setCooldownRemaining(systemState.settings.cooldown_seconds || 15);
        }
      } else if (res.status === 429) {
        showToast(data.detail, 'warning');
      } else {
        showToast(data.detail || t.errorGeneric, 'error');
      }
    } catch {
      showToast(t.errorNetwork, 'error');
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        p.category_id === selectedCategory ||
        p.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const titleAr = (p.title_ar || p.title || '').toLowerCase();
      const titleEn = (p.title_en || '').toLowerCase();
      const textAr = (p.text_ar || p.text || '').toLowerCase();
      const textEn = (p.text_en || '').toLowerCase();

      const matchesSearch =
        titleAr.includes(q) ||
        titleEn.includes(q) ||
        textAr.includes(q) ||
        textEn.includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [presets, selectedCategory, searchQuery]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#070C1B] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'} pb-16 transition-colors duration-200`}>
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md border animate-bounce text-sm font-semibold transition-all"
             style={{
               backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : toast.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(239, 68, 68, 0.95)',
               borderColor: toast.type === 'success' ? '#10B981' : toast.type === 'warning' ? '#F59E0B' : '#EF4444',
               color: '#FFFFFF'
             }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-lg border-b px-4 lg:px-8 py-3.5 shadow-xl transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#0B132B]/90 border-[#1F3152]' : 'bg-white/90 border-slate-200 shadow-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand Identity with User Uploaded Logo */}
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

          {/* Controls: Speaker Status, Volume, Theme Toggle, Language Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* Live Speaker Status Pill */}
            <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
              theme === 'dark' ? 'bg-[#121C33] border-[#1F3152]' : 'bg-slate-100 border-slate-200'
            }`}>
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
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    {t.statusReady}
                  </span>
                </>
              )}
            </div>

            {/* Volume Badge */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-colors ${
              theme === 'dark' ? 'bg-[#121C33] border-[#1F3152] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <Volume2 className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-[#00D2FF]' : 'text-sky-600'}`} />
              <span>{systemState.server_volume}%</span>
            </div>

            {/* Cooldown Timer Badge */}
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
              title="Change Language / تغيير اللغة"
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-6 space-y-8">
        
        {/* Search & Dynamic Category Filter Bar */}
        <section className={`p-4 rounded-3xl border shadow-xl flex flex-col md:flex-row gap-4 justify-between items-center transition-colors duration-200 ${
          theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 shadow-slate-100'
        }`}>
          {/* Instant Search Bar */}
          <div className="relative w-full md:w-96">
            <Search className={`w-4 h-4 absolute ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-slate-400`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full border rounded-2xl ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-sm transition-all focus:outline-none ${
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

          {/* Dynamic Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {/* All Category Pill */}
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

            {/* Dynamic Categories from API */}
            {categories.map((cat) => {
              const count = presets.filter(p => p.category_id === cat.id || p.category === cat.name_ar).length;
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

        {/* 20 Presets Grid Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${theme === 'dark' ? 'text-[#00D2FF]' : 'text-sky-600'}`} />
              <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {t.quickAlertsTitle}
              </h2>
            </div>
            <span className={`text-xs font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {filteredPresets.length} {t.presetsCount}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredPresets.map((preset) => {
              const IconComponent = ICON_MAP[preset.icon] || Volume2;
              const title = preset.title || preset.title_ar || preset.title_en || preset.id;
              const text = preset.text || preset.text_ar || preset.text_en || '';

              // Find category name
              const matchedCat = categories.find(c => c.id === preset.category_id || c.name_ar === preset.category);
              const categoryBadge = matchedCat 
                ? (lang === 'en' ? matchedCat.name_en : matchedCat.name_ar) 
                : (preset.category || t.allCategories);

              return (
                <div
                  key={preset.id}
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

                    {/* Title */}
                    <h3 className={`font-bold text-sm mb-1.5 transition-colors ${
                      theme === 'dark' ? 'text-white group-hover:text-[#00D2FF]' : 'text-slate-900 group-hover:text-sky-600'
                    }`}>
                      {title}
                    </h3>

                    {/* Spoken Text Excerpt */}
                    <p className={`text-xs line-clamp-2 leading-relaxed ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      "{text}"
                    </p>
                  </div>

                  {/* Trigger Button */}
                  <button
                    onClick={() => handleSpeakPreset(preset)}
                    disabled={cooldownRemaining > 0}
                    className={`mt-5 w-full py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn ${
                      theme === 'dark'
                        ? 'bg-[#162238] hover:bg-[#00D2FF] text-slate-200 hover:text-slate-950 border-[#1F3152] hover:border-[#00D2FF]'
                        : 'bg-slate-100 hover:bg-sky-600 text-slate-700 hover:text-white border-slate-200 hover:border-sky-600'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" />
                    <span>{t.speakButton}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Lower Row: Free Speech Box with AI Tashkeel */}
        <div className="max-w-4xl mx-auto">
          
          <section className={`border rounded-3xl p-6 sm:p-8 shadow-xl transition-colors duration-200 ${
            theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 shadow-slate-100'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                    theme === 'dark' ? 'bg-[#00D2FF]/10 border-[#00D2FF]/30 text-[#00D2FF]' : 'bg-sky-50 border-sky-200 text-sky-600'
                  }`}>
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {t.freeSpeechTitle}
                    </h2>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t.freeSpeechSubtitle}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-mono font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {customText.length}/400
                </span>
              </div>

              <form onSubmit={handleCustomSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    rows={4}
                    maxLength={400}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        if (customText.trim() && !isSubmittingCustom && cooldownRemaining <= 0) {
                          handleCustomSubmit(e);
                        }
                      }
                    }}
                    placeholder={t.freeSpeechPlaceholder}
                    className={`w-full border rounded-2xl p-4 text-sm sm:text-base leading-relaxed transition-all resize-none focus:outline-none ${
                      theme === 'dark'
                        ? 'bg-[#070C1B] border-[#1F3152] text-white placeholder-slate-500 focus:border-[#00D2FF]'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                    }`}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* Action Left: AI Tashkeel & Shortcut */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleTashkeel}
                      disabled={isTashkeelLoading || !customText.trim()}
                      className={`py-2 px-3.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        theme === 'dark'
                          ? 'bg-[#162238] hover:bg-[#1F3152] text-[#00D2FF] border-[#1F3152] hover:border-[#00D2FF]/40'
                          : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
                      }`}
                      title="تشكيل النص العربي تلقائياً بالذكاء الاصطناعي لضمان النطق السليم"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isTashkeelLoading ? 'animate-spin' : ''}`} />
                      <span>{isTashkeelLoading ? t.tashkeelProcessing : t.tashkeelBtn}</span>
                    </button>

                    <span className={`text-[11px] font-mono hidden sm:inline-block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {t.ctrlEnterHint}
                    </span>
                  </div>

                  {/* Action Right: Dispatch Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingCustom || !customText.trim() || cooldownRemaining > 0}
                    className="py-2.5 px-7 rounded-2xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:from-[#33DCFF] hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#00D2FF]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingCustom ? t.speakingSubmitting : t.speakNowButton}</span>
                  </button>
                </div>
              </form>
            </div>
          </section>

        </div>

      </main>

      {/* Public Footer - Strictly clean with ZERO admin mention */}
      <footer className={`mt-14 text-center text-xs border-t pt-6 transition-colors duration-200 ${
        theme === 'dark' ? 'text-slate-500 border-[#1F3152]/40' : 'text-slate-400 border-slate-200'
      }`}>
        <p>{t.footerText}</p>
      </footer>
    </div>
  );
}
