import React, { useState, useEffect } from 'react';
import {
  Shield, Key, LogOut, ArrowRight, Settings, Sliders, Database,
  History, Volume2, Bell, Radio, Check, AlertCircle, RefreshCw,
  Plus, Trash2, Edit2, Play, VolumeX, Sparkles, ExternalLink, Activity
} from 'lucide-react';

export default function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem('kernelping_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('settings'); // settings | presets | audit

  // Admin Data State
  const [settings, setSettings] = useState({
    spam_cooldown_enabled: true,
    cooldown_seconds: 15,
    pre_chime_enabled: true,
    chime_tone: 'airport',
    bluetooth_wakeup_enabled: true,
    server_volume: 85,
    tts_voice: 'ar-SY-LaithNeural'
  });
  const [presets, setPresets] = useState([]);
  const [auditData, setAuditData] = useState({
    total_announcements: 0,
    sources_breakdown: {},
    recent_entries: []
  });

  // Modal / Editing State
  const [editingPreset, setEditingPreset] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPresetForm, setNewPresetForm] = useState({
    id: '',
    category: 'اجتماعات وتنسيق',
    title: '',
    text: '',
    icon: 'Volume2',
    color: 'cyan'
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Check auth on mount
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const verifyToken = async (currentToken) => {
    try {
      const res = await fetch('/api/admin/verify', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        setIsAuthenticated(true);
        loadAdminData(currentToken);
      } else {
        handleLogout();
      }
    } catch {
      handleLogout();
    }
  };

  const loadAdminData = async (authToken = token) => {
    try {
      // Load Settings
      const sRes = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (sRes.ok) {
        const data = await sRes.json();
        setSettings(data.settings);
      }

      // Load Presets
      const pRes = await fetch('/api/admin/presets', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        setPresets(pData);
      }

      // Load Audit
      const aRes = await fetch('/api/admin/audit', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (aRes.ok) {
        const aData = await aRes.json();
        setAuditData(aData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kernelping_token');
    setToken('');
    setIsAuthenticated(false);
  };

  // --- Live Settings Updates ---
  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showToast('تم حفظ الإعدادات وتطبيقها فوراً في السيرفر', 'success');
      }
    } catch (err) {
      showToast('تعذر حفظ الإعدادات', 'error');
    }
  };

  const handleVolumeChange = async (vol) => {
    updateSetting('server_volume', parseInt(vol, 10));
  };

  const handleTestChime = async (tone) => {
    try {
      const res = await fetch('/api/admin/test-chime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tone })
      });
      if (res.ok) {
        showToast(`جاري تشغيل نغمة ${tone} على خادم الصوت 🔔`, 'success');
      }
    } catch {
      showToast('تعذر تشغيل نغمة الاختبار', 'error');
    }
  };

  // --- Presets Actions ---
  const handleSavePreset = async (preset) => {
    try {
      const res = await fetch(`/api/admin/presets/${preset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(preset)
      });
      if (res.ok) {
        showToast('تم تعديل الجملة وبناء الملف الصوتي', 'success');
        setEditingPreset(null);
        loadAdminData();
      }
    } catch {
      showToast('تعذر حفظ الجملة', 'error');
    }
  };

  const handleCreatePreset = async (e) => {
    e.preventDefault();
    if (!newPresetForm.id.trim() || !newPresetForm.title.trim() || !newPresetForm.text.trim()) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/admin/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newPresetForm)
      });
      if (res.ok) {
        showToast('تمت إضافة الجملة وتوليد الملف الصوتي مسبقاً 🎉', 'success');
        setIsAddModalOpen(false);
        setNewPresetForm({
          id: '',
          category: 'اجتماعات وتنسيق',
          title: '',
          text: '',
          icon: 'Volume2',
          color: 'cyan'
        });
        loadAdminData();
      } else {
        const data = await res.json();
        showToast(data.detail || 'خطأ في إنشاء الجملة', 'error');
      }
    } catch {
      showToast('تعذر الاتصال بالخادم', 'error');
    }
  };

  const handleDeletePreset = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الجملة نهائياً من النظام؟')) return;
    try {
      const res = await fetch(`/api/admin/presets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('تم حذف الجملة بنجاح', 'success');
        loadAdminData();
      }
    } catch {
      showToast('تعذر حذف الجملة', 'error');
    }
  };

  const handleRebuildAllCache = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/presets/rebuild-all-cache', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('تمت إعادة توليد وتخزين كافة الملفات الصوتية بنجاح ⚡', 'success');
        loadAdminData();
      }
    } catch {
      showToast('حدث خطأ أثناء إعادة التوليد', 'error');
    } finally {
      setLoading(false);
    }
  };

  // If not authenticated, render Login Page
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={(newToken) => {
      localStorage.setItem('kernelping_token', newToken);
      setToken(newToken);
      setIsAuthenticated(true);
      loadAdminData(newToken);
    }} />;
  }

  return (
    <div className="min-h-screen bg-[#070C1B] text-slate-100 pb-16 font-['Tajawal',sans-serif]">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md border text-sm font-semibold transition-all"
             style={{
               backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : toast.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(239, 68, 68, 0.95)',
               borderColor: toast.type === 'success' ? '#10B981' : toast.type === 'warning' ? '#F59E0B' : '#EF4444'
             }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Admin Stealth Header */}
      <header className="sticky top-0 z-40 bg-[#0B132B] border-b border-[#1F3152] px-4 lg:px-8 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D2FF] to-indigo-600 flex items-center justify-center shadow-lg shadow-[#00D2FF]/20">
              <Shield className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white">Stealth Admin Center</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  لوحة التحكم المخفية
                </span>
              </div>
              <p className="text-xs text-slate-400">إدارة هندسة الصوت، الجمل الثابتة، والتدقيق الأمني</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#162238] hover:bg-[#1F3152] text-xs font-semibold text-slate-300 border border-[#1F3152] transition-colors"
            >
              <span>الواجهة العامة</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-6">
        <div className="flex items-center gap-2 border-b border-[#1F3152] pb-3">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-[#00D2FF] text-slate-950 shadow-md shadow-[#00D2FF]/20'
                : 'text-slate-400 hover:text-white hover:bg-[#162238]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>إعدادات وهندسة الصوت</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'presets'
                ? 'bg-[#00D2FF] text-slate-950 shadow-md shadow-[#00D2FF]/20'
                : 'text-slate-400 hover:text-white hover:bg-[#162238]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>إدارة الجمل والتخزين (Presets CRUD)</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-[#00D2FF] text-slate-950 shadow-md shadow-[#00D2FF]/20'
                : 'text-slate-400 hover:text-white hover:bg-[#162238]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل العمليات والتدقيق (Activity Audit)</span>
          </button>
        </div>
      </div>

      {/* Main Tab Panels */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-6">
        
        {/* TAB 1: SETTINGS & AUDIO ENGINE */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Audio Sinks & PipeWire Master Volume */}
            <div className="bg-[#0B132B] border border-[#1F3152] rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-5 h-5 text-[#00D2FF]" />
                <h3 className="font-bold text-sm text-white">التحكم في صوت السيرفر (PipeWire / WirePlumber)</h3>
              </div>
              <p className="text-xs text-slate-400">
                التحكم المباشر بمستوى صوت مخرج الصوت الافتراضي (Default Sink) دون ربط عتادي ثابت، ليعمل بسلاسة مع سلك AUX أو البلوتوث.
              </p>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">مستوى الصوت الرئيسي (wpctl):</span>
                  <span className="text-sm font-mono font-bold text-[#00D2FF]">{settings.server_volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.server_volume}
                  onChange={(e) => handleVolumeChange(e.target.value)}
                  className="w-full h-2 bg-[#162238] rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
                />
                <div className="flex justify-between gap-1.5 mt-3">
                  {[25, 50, 70, 85, 100].map((v) => (
                    <button
                      key={v}
                      onClick={() => handleVolumeChange(v)}
                      className="text-[11px] font-mono px-3 py-1 rounded-lg bg-[#162238] hover:bg-[#1F3152] text-slate-300 transition-colors"
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>

              {/* TTS Voice Selector */}
              <div className="pt-3 border-t border-[#1F3152]">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  صوت المعالجة الصوتية (Edge TTS Voice):
                </label>
                <select
                  value={settings.tts_voice}
                  onChange={(e) => updateSetting('tts_voice', e.target.value)}
                  className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00D2FF]"
                >
                  <option value="ar-SY-LaithNeural">ar-SY-LaithNeural (ليث - نبرة واضحة ومثالية للإذاعة المكتبية)</option>
                  <option value="ar-SA-HamedNeural">ar-SA-HamedNeural (حامد - صوت إذاعي هادئ ومتزن)</option>
                </select>
              </div>
            </div>

            {/* Chime & Bluetooth Wakeup Settings */}
            <div className="bg-[#0B132B] border border-[#1F3152] rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-2.5">
                <Bell className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">نغمات التنبيه وإيقاظ البلوتوث (Chimes & Bluetooth)</h3>
              </div>

              {/* Pre-Announcement Chime Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121C33] border border-[#1F3152]">
                <div>
                  <h4 className="text-xs font-bold text-white">نغمة التنبيه المسبقة (Pre-Announcement Chime)</h4>
                  <p className="text-[11px] text-slate-400">تشغيل نغمة قصيرة لجذب انتباه الزملاء قبل بدء الكلام</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pre_chime_enabled}
                  onChange={(e) => updateSetting('pre_chime_enabled', e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer accent-[#00D2FF]"
                />
              </div>

              {/* Chime Selector */}
              {settings.pre_chime_enabled && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    اختيار نوع النغمة:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'airport', name: 'مطار (Airport)' },
                      { id: 'bell', name: 'جرس (Bell)' },
                      { id: 'alert', name: 'إنذار (Alert)' }
                    ].map((tone) => (
                      <div
                        key={tone.id}
                        className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                          settings.chime_tone === tone.id
                            ? 'bg-[#00D2FF]/10 border-[#00D2FF] text-[#00D2FF] font-bold'
                            : 'bg-[#121C33] border-[#1F3152] text-slate-300 hover:border-slate-500'
                        }`}
                        onClick={() => updateSetting('chime_tone', tone.id)}
                      >
                        <span className="text-xs block mb-1">{tone.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestChime(tone.id);
                          }}
                          className="text-[10px] text-slate-400 hover:text-white underline"
                        >
                          تجربة الصوت ▶
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bluetooth Wake-up Ping */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121C33] border border-[#1F3152]">
                <div>
                  <h4 className="text-xs font-bold text-white">وضع إيقاظ البلوتوث الاستباقي (Bluetooth Wake-up)</h4>
                  <p className="text-[11px] text-slate-400">تشغيل نغمة مسبوقة بمهلة 400ms صمت لتنشيط مكبر الصوت A2DP قبل نطق أول كلمة</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.bluetooth_wakeup_enabled}
                  onChange={(e) => updateSetting('bluetooth_wakeup_enabled', e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer accent-[#00D2FF]"
                />
              </div>

              {/* Spam Cooldown Settings */}
              <div className="pt-3 border-t border-[#1F3152] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">مانع الإزعاج والتكرار (Spam Cooldown)</h4>
                    <p className="text-[11px] text-slate-400">منع إطلاق نداءات متتالية إلا بعد مرور مهلة زمنية محددة</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.spam_cooldown_enabled}
                    onChange={(e) => updateSetting('spam_cooldown_enabled', e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer accent-[#00D2FF]"
                  />
                </div>

                {settings.spam_cooldown_enabled && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300">مهلة التكرار بين النداءات:</span>
                      <span className="font-mono text-[#00D2FF] font-bold">{settings.cooldown_seconds} ثانية</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={settings.cooldown_seconds}
                      onChange={(e) => updateSetting('cooldown_seconds', parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-[#162238] rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
                    />
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: PRESETS CRUD & AUDIO CACHING */}
        {activeTab === 'presets' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0B132B] p-4 rounded-2xl border border-[#1F3152]">
              <div>
                <h3 className="font-bold text-sm text-white">إدارة الجمل الجاهزة والتخزين المسبق (Audio Caching)</h3>
                <p className="text-xs text-slate-400">تخزين الجمل كملفات MP3 محلية لتشغيل فوري بزمن استجابة صفر ودون الاعتماد على الإنترنت</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRebuildAllCache}
                  disabled={loading}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#162238] hover:bg-[#1F3152] text-xs font-semibold text-[#00D2FF] border border-[#1F3152] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>إعادة توليد كافة الأصوات</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00D2FF] hover:bg-[#33DCFF] text-slate-950 text-xs font-bold shadow-md shadow-[#00D2FF]/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة جملة جديدة</span>
                </button>
              </div>
            </div>

            {/* Presets Table */}
            <div className="bg-[#0B132B] border border-[#1F3152] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#121C33] text-slate-400 border-b border-[#1F3152] font-semibold">
                    <tr>
                      <th className="py-3 px-4">المعرف (ID)</th>
                      <th className="py-3 px-4">العنوان</th>
                      <th className="py-3 px-4">التصنيف</th>
                      <th className="py-3 px-4">النص المنطوق بالعربية</th>
                      <th className="py-3 px-4">حالة التخزين</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F3152] text-slate-300">
                    {presets.map((p) => (
                      <tr key={p.id} className="hover:bg-[#121C33]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{p.id}</td>
                        <td className="py-3 px-4 font-bold text-white">{p.title}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-[#162238] text-slate-300 text-[11px]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-300">{p.text}</td>
                        <td className="py-3 px-4">
                          {p.cached ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <Check className="w-3 h-3" />
                              <span>مخزن MP3 (0ms)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <AlertCircle className="w-3 h-3" />
                              <span>غير مخزن</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditingPreset(p)}
                              className="p-1.5 rounded-lg bg-[#162238] hover:bg-[#1F3152] text-slate-300 transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePreset(p.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Add New Preset */}
            {isAddModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#0B132B] border border-[#1F3152] rounded-2xl w-full max-w-md p-6 shadow-2xl">
                  <h3 className="font-bold text-sm text-white mb-4">إضافة نداء مسبق جديد إلى النظام</h3>
                  <form onSubmit={handleCreatePreset} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">المعرف التعريفي (ID بالإنجليزية):</label>
                      <input
                        type="text"
                        required
                        value={newPresetForm.id}
                        onChange={(e) => setNewPresetForm({ ...newPresetForm, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        placeholder="standup_meeting"
                        className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان الزر:</label>
                      <input
                        type="text"
                        required
                        value={newPresetForm.title}
                        onChange={(e) => setNewPresetForm({ ...newPresetForm, title: e.target.value })}
                        placeholder="بدء الستاند أب الصباحي"
                        className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">التصنيف:</label>
                      <select
                        value={newPresetForm.category}
                        onChange={(e) => setNewPresetForm({ ...newPresetForm, category: e.target.value })}
                        className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="اجتماعات وتنسيق">اجتماعات وتنسيق</option>
                        <option value="ديف أوبس وبنية تحتية">ديف أوبس وبنية تحتية</option>
                        <option value="ضيافة وحياة المكتب">ضيافة وحياة المكتب</option>
                        <option value="طوارئ وتنبيهات أمنية">طوارئ وتنبيهات أمنية</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">نص النطق الكامل بالعربية:</label>
                      <textarea
                        rows={3}
                        required
                        value={newPresetForm.text}
                        onChange={(e) => setNewPresetForm({ ...newPresetForm, text: e.target.value })}
                        placeholder="يا شباب، حان موعد الستاند أب الصباحي في قاعة الاجتماعات..."
                        className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl p-3 text-xs text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-[#162238] text-slate-300 text-xs font-semibold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#00D2FF] text-slate-950 font-bold text-xs shadow-md shadow-[#00D2FF]/20"
                      >
                        حفظ وتوليد الصوت
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Edit Preset */}
            {editingPreset && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#0B132B] border border-[#1F3152] rounded-2xl w-full max-w-md p-6 shadow-2xl">
                  <h3 className="font-bold text-sm text-white mb-4">تعديل جملة: {editingPreset.title}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان الزر:</label>
                      <input
                        type="text"
                        value={editingPreset.title}
                        onChange={(e) => setEditingPreset({ ...editingPreset, title: e.target.value })}
                        className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">نص النطق:</label>
                      <textarea
                        rows={3}
                        value={editingPreset.text}
                        onChange={(e) => setEditingPreset({ ...editingPreset, text: e.target.value })}
                        className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl p-3 text-xs text-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingPreset(null)}
                        className="px-4 py-2 rounded-xl bg-[#162238] text-slate-300 text-xs font-semibold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSavePreset(editingPreset)}
                        className="px-4 py-2 rounded-xl bg-[#00D2FF] text-slate-950 font-bold text-xs"
                      >
                        حفظ التعديلات
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: ACTIVITY AUDIT */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            {/* Stats Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0B132B] border border-[#1F3152] rounded-2xl p-5 shadow-xl">
                <span className="text-xs text-slate-400">إجمالي النداءات المنفذة</span>
                <p className="text-2xl font-mono font-black text-[#00D2FF] mt-1">
                  {auditData.total_announcements}
                </p>
              </div>
              <div className="bg-[#0B132B] border border-[#1F3152] rounded-2xl p-5 shadow-xl">
                <span className="text-xs text-slate-400">نداءات الجمل الثابتة (Presets)</span>
                <p className="text-2xl font-mono font-black text-emerald-400 mt-1">
                  {auditData.sources_breakdown?.preset || 0}
                </p>
              </div>
              <div className="bg-[#0B132B] border border-[#1F3152] rounded-2xl p-5 shadow-xl">
                <span className="text-xs text-slate-400">النطق الحر واستدعاء الأجهزة</span>
                <p className="text-2xl font-mono font-black text-amber-400 mt-1">
                  {(auditData.sources_breakdown?.free_text || 0) + (auditData.sources_breakdown?.device_call || 0)}
                </p>
              </div>
            </div>

            {/* Audit Log Table (Last 20) */}
            <div className="bg-[#0B132B] border border-[#1F3152] rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[#1F3152] flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">سجل العمليات الأخير (آخر 20 نداء بالمكتب)</h3>
                <span className="text-xs text-slate-400 font-mono">تدقيق لحظي حي</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#121C33] text-slate-400 border-b border-[#1F3152] font-semibold">
                    <tr>
                      <th className="py-3 px-4">الوقت والتاريخ</th>
                      <th className="py-3 px-4">العنوان</th>
                      <th className="py-3 px-4">النوع / المصدر</th>
                      <th className="py-3 px-4">نص الرسالة المنطوقة</th>
                      <th className="py-3 px-4">المرسل (IP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F3152] text-slate-300">
                    {auditData.recent_entries.map((log) => (
                      <tr key={log.id} className="hover:bg-[#121C33]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">{log.title}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.source === 'preset' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                            log.source === 'device_call' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {log.source === 'preset' ? 'زر سريع' : log.source === 'device_call' ? 'استدعاء' : 'نطق حر'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-md truncate">{log.text}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{log.sender_ip}</td>
                      </tr>
                    ))}
                    {auditData.recent_entries.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          لا توجد عمليات مسجلة بعد في السجل
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

// Minimalist Standalone Login Screen for /admin
function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.token);
      } else {
        setError(data.detail || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch {
      setError('تعذر الاتصال بخادم المصادقة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070C1B] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0B132B] border border-[#1F3152] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D2FF]/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D2FF] to-blue-700 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#00D2FF]/20">
            <Shield className="w-7 h-7 text-slate-950" />
          </div>
          <h2 className="text-lg font-black text-white">مركز العمليات الداخلي</h2>
          <p className="text-xs text-slate-400 mt-1">تسجيل الدخول إلى لوحة التحكم والإعدادات</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المستخدم:</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00D2FF] transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة المرور:</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#070C1B] border border-[#1F3152] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00D2FF] transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:from-[#33DCFF] hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-[#00D2FF]/20 transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" />
            <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول للوحة التحكم'}</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-500">
            بيانات الاعتماد الافتراضية: admin / kernel2026
          </p>
        </div>
      </div>
    </div>
  );
}

