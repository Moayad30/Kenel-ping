import React, { useState, useEffect, useMemo } from 'react';
import {
  Volume2, VolumeX, Mic, Bell, Users, Calendar, Code, RotateCcw,
  PhoneCall, Rocket, CheckCircle2, Snowflake, AlertTriangle, ServerCrash,
  Coffee, Utensils, Smile, Package, PartyPopper, ShieldAlert, WifiOff,
  Sparkles, Lock, Flame, Search, Send, Radio, Activity, Clock
} from 'lucide-react';

const ICON_MAP = {
  Users, Calendar, Code, RotateCcw, PhoneCall, Rocket, CheckCircle2,
  Snowflake, AlertTriangle, ServerCrash, Coffee, Utensils, Smile,
  Package, PartyPopper, ShieldAlert, WifiOff, Sparkles, Lock, Flame, Volume2
};

const CATEGORIES = [
  'الكل',
  'اجتماعات وتنسيق',
  'ديف أوبس وبنية تحتية',
  'ضيافة وحياة المكتب',
  'طوارئ وتنبيهات أمنية'
];

export default function PublicWorkspace() {
  const [presets, setPresets] = useState([]);
  const [systemState, setSystemState] = useState({
    status: 'ready',
    current_item: null,
    queue_length: 0,
    server_volume: 85,
    settings: { spam_cooldown_enabled: true, cooldown_seconds: 15 }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  
  // Custom Speech Box
  const [customText, setCustomText] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // Device / Member Callout
  const [callTarget, setCallTarget] = useState('المهندس المناوب (On-Call)');
  const [callMessage, setCallMessage] = useState('يرجى الحضور إلى قاعة الاجتماعات الرئيسية فوراً.');
  const [isSubmittingCall, setIsSubmittingCall] = useState(false);

  // Feedback & Cooldown UI
  const [toast, setToast] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Fetch presets and status
  useEffect(() => {
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
        } catch (e) {
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
      showToast(`يرجى الانتظار ${cooldownRemaining} ثوانٍ قبل إرسال نداء آخر منعاً للإزعاج`, 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/speak/preset/${preset.id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`تم إطلاق نداء "${preset.title}" بنجاح 🔊`, 'success');
        if (systemState.settings?.spam_cooldown_enabled) {
          setCooldownRemaining(systemState.settings.cooldown_seconds || 15);
        }
      } else if (res.status === 429) {
        showToast(data.detail, 'warning');
      } else {
        showToast(data.detail || 'حدث خطأ أثناء إرسال النداء', 'error');
      }
    } catch (err) {
      showToast('تعذر الاتصال بخادم الصوت', 'error');
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customText.trim()) return;

    if (cooldownRemaining > 0) {
      showToast(`يرجى الانتظار ${cooldownRemaining} ثوانٍ قبل إرسال نداء آخر`, 'warning');
      return;
    }

    setIsSubmittingCustom(true);
    try {
      const res = await fetch('/api/speak/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim() || 'نداء حر من الفريق',
          text: customText.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('تم إرسال النص إلى إذاعة المكتب 🎙️', 'success');
        setCustomText('');
        setCustomTitle('');
        if (systemState.settings?.spam_cooldown_enabled) {
          setCooldownRemaining(systemState.settings.cooldown_seconds || 15);
        }
      } else if (res.status === 429) {
        showToast(data.detail, 'warning');
      } else {
        showToast(data.detail || 'خطأ في معالجة النص', 'error');
      }
    } catch (err) {
      showToast('تعذر الاتصال بالخادم', 'error');
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleCallSubmit = async (e) => {
    e.preventDefault();
    if (!callTarget.trim()) return;

    if (cooldownRemaining > 0) {
      showToast(`يرجى الانتظار ${cooldownRemaining} ثوانٍ قبل الاستدعاء`, 'warning');
      return;
    }

    setIsSubmittingCall(true);
    try {
      const res = await fetch('/api/speak/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: callTarget,
          message: callMessage
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`تم إطلاق استدعاء ${callTarget} في أرجاء المكتب 📢`, 'success');
        if (systemState.settings?.spam_cooldown_enabled) {
          setCooldownRemaining(systemState.settings.cooldown_seconds || 15);
        }
      } else if (res.status === 429) {
        showToast(data.detail, 'warning');
      } else {
        showToast(data.detail || 'خطأ في إرسال الاستدعاء', 'error');
      }
    } catch (err) {
      showToast('تعذر إرسال الاستدعاء', 'error');
    } finally {
      setIsSubmittingCall(false);
    }
  };

  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      const matchesCategory = selectedCategory === 'الكل' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [presets, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#070C1B] text-slate-100 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md border animate-bounce text-sm font-semibold transition-all"
             style={{
               backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : toast.type === 'warning' ? 'rgba(245, 158, 11, 0.9)' : 'rgba(239, 68, 68, 0.9)',
               borderColor: toast.type === 'success' ? '#10B981' : toast.type === 'warning' ? '#F59E0B' : '#EF4444'
             }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0B132B]/90 backdrop-blur-lg border-b border-[#1F3152] px-4 lg:px-8 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00D2FF] to-blue-700 flex items-center justify-center shadow-lg shadow-[#00D2FF]/20 ring-1 ring-[#00D2FF]/40">
              <Radio className="w-6 h-6 text-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">Kernel Ping</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/30 font-bold">
                  كيرنال بينغ
                </span>
              </div>
              <p className="text-xs text-slate-400">نظام النداء والإذاعة الصوتي لمكتب كيرنال تك</p>
            </div>
          </div>

          {/* Live Speaker & PipeWire Status Indicator */}
          <div className="flex items-center gap-3">
            {/* Status Pill */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#121C33] border border-[#1F3152]">
              {systemState.status === 'speaking' ? (
                <>
                  <div className="flex items-end gap-1 h-4">
                    <span className="w-1 bg-[#00D2FF] rounded-full animate-sound-wave" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 bg-[#00D2FF] rounded-full animate-sound-wave" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 bg-[#00D2FF] rounded-full animate-sound-wave" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs font-bold text-[#00D2FF]">قيد النطق الآن بالمكتب</span>
                </>
              ) : systemState.status === 'queued' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-bold text-amber-300">
                    في الطابور ({systemState.queue_length})
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
                  <span className="text-xs font-medium text-emerald-300">البفلة جاهزة</span>
                </>
              )}
            </div>

            {/* Volume Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121C33] border border-[#1F3152] text-xs text-slate-300 font-mono">
              <Volume2 className="w-3.5 h-3.5 text-[#00D2FF]" />
              <span>{systemState.server_volume}%</span>
            </div>

            {/* Cooldown Timer (if active) */}
            {cooldownRemaining > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 font-mono font-bold animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>مهلة: {cooldownRemaining}s</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-6 space-y-8">
        
        {/* Search & Filter Bar */}
        <section className="bg-[#0B132B] p-4 rounded-2xl border border-[#1F3152] shadow-xl flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Instant Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن جملة، تنبيه، أو أمر إذاعي..."
              className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D2FF] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#00D2FF] text-slate-950 font-bold shadow-md shadow-[#00D2FF]/20'
                    : 'bg-[#121C33] text-slate-300 hover:bg-[#1C2A47] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* 20 Categorized Presets Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00D2FF]" />
              <h2 className="text-base font-bold text-white">شبكة التنبيهات السريعة (جاهزة للاستجابة الفورية)</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {filteredPresets.length} من أصل {presets.length} جملة
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredPresets.map((preset) => {
              const IconComponent = ICON_MAP[preset.icon] || Volume2;
              return (
                <div
                  key={preset.id}
                  className="group relative bg-[#0B132B] hover:bg-[#121C33] border border-[#1F3152] hover:border-[#00D2FF]/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-lg hover:shadow-[#00D2FF]/10 hover:-translate-y-0.5"
                >
                  <div>
                    {/* Header: Icon & Category Tag */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[#162238] group-hover:bg-[#00D2FF]/10 border border-[#1F3152] group-hover:border-[#00D2FF]/40 flex items-center justify-center transition-colors">
                        <IconComponent className="w-4 h-4 text-[#00D2FF]" />
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#162238] text-slate-400">
                        {preset.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-sm text-white group-hover:text-[#00D2FF] transition-colors mb-1.5">
                      {preset.title}
                    </h3>

                    {/* Spoken text excerpt */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      "{preset.text}"
                    </p>
                  </div>

                  {/* Trigger Button */}
                  <button
                    onClick={() => handleSpeakPreset(preset)}
                    disabled={cooldownRemaining > 0}
                    className="mt-4 w-full py-2 px-3 rounded-xl bg-[#162238] hover:bg-[#00D2FF] text-slate-300 hover:text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 border border-[#1F3152] hover:border-[#00D2FF] transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#00D2FF] group-hover/btn:text-slate-950 transition-colors" />
                    <span>إذاعة النداء</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Lower Row: Free Speech Box & Device Callout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Free Text-to-Speech Box ("صندوق النطق الحر") */}
          <section className="bg-[#0B132B] border border-[#1F3152] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00D2FF]/10 border border-[#00D2FF]/30 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-[#00D2FF]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-white">صندوق النطق الحر</h2>
                    <p className="text-[11px] text-slate-400">تحويل أي نص عربي مكتوب إلى كلام مسموع بالمكتب عبر Edge TTS</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {customText.length}/300
                </span>
              </div>

              <form onSubmit={handleCustomSubmit} className="space-y-3">
                <textarea
                  rows={3}
                  maxLength={300}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="اكتب رسالتك هنا ليتم نطقها في أرجاء المكتب... (مثال: نذكر الجميع ببدء صلاة الظهر بعد قليل)"
                  className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00D2FF] transition-all resize-none"
                />

                {/* Quick Phrases */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-slate-400 self-center ml-1">اقتراحات سريعة:</span>
                  {[
                    'يرجى خفض الصوت في القاعة',
                    'وصل طلب الطعام في المطبخ',
                    'استراحة قصيرة للقهوة',
                    'اجتماع طارئ بعد دقيقتين'
                  ].map((phrase) => (
                    <button
                      type="button"
                      key={phrase}
                      onClick={() => setCustomText(phrase)}
                      className="text-[10px] bg-[#162238] hover:bg-[#1F3152] text-slate-300 px-2.5 py-1 rounded-lg border border-[#1F3152] transition-colors"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingCustom || !customText.trim() || cooldownRemaining > 0}
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:from-[#33DCFF] hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#00D2FF]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingCustom ? 'جاري الإرسال...' : 'نطق الرسالة الآن'}</span>
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Device & Member Callout ("استدعاء الأجهزة والأفراد") */}
          <section className="bg-[#0B132B] border border-[#1F3152] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white">استدعاء الأجهزة والأفراد</h2>
                  <p className="text-[11px] text-slate-400">توجيه نداء نداء مخصص باسم الشخص أو الدور الوظيفي</p>
                </div>
              </div>

              <form onSubmit={handleCallSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    الجهة أو الشخص المستدعى:
                  </label>
                  <select
                    value={callTarget}
                    onChange={(e) => setCallTarget(e.target.value)}
                    className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00D2FF] transition-all"
                  >
                    <option value="المهندس المناوب (On-Call)">المهندس المناوب (On-Call)</option>
                    <option value="فريق الديف أوبس والبنية التحتية">فريق الديف أوبس والبنية التحتية</option>
                    <option value="قائد الفريق التقني (Tech Lead)">قائد الفريق التقني (Tech Lead)</option>
                    <option value="فريق تطوير الواجهات (Frontend)">فريق تطوير الواجهات (Frontend)</option>
                    <option value="فريق الباك إند (Backend Team)">فريق الباك إند (Backend Team)</option>
                    <option value="إدارة المكتب والاستقبال">إدارة المكتب والاستقبال</option>
                    <option value="فريق أمن المعلومات (Security)">فريق أمن المعلومات (Security)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    الرسالة أو الإجراء المطلوب:
                  </label>
                  <input
                    type="text"
                    value={callMessage}
                    onChange={(e) => setCallMessage(e.target.value)}
                    placeholder="مثال: يرجى الحضور فوراً إلى قاعة السيرفرات أو الاجتماعات"
                    className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D2FF] transition-all"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingCall || !callTarget.trim() || cooldownRemaining > 0}
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Bell className="w-3.5 h-3.5 animate-bounce" />
                    <span>{isSubmittingCall ? 'جاري الاستدعاء...' : 'إرسال استدعاء عاجل 📢'}</span>
                  </button>
                </div>
              </form>
            </div>
          </section>

        </div>

      </main>

      {/* Public Footer - Strictly clean, NO admin link or hint whatsoever */}
      <footer className="mt-12 text-center text-xs text-slate-500 border-t border-[#1F3152]/40 pt-6">
        <p>نظام Kernel Ping © 2026 - بيئة الاتصال الصوتي الداخلي لمكتب كيرنال تك</p>
      </footer>
    </div>
  );
}

