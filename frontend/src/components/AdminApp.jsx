import React, { useState, useEffect } from 'react';
import {
  Shield, Key, LogOut, ArrowRight, Settings, Sliders, Database,
  History, Volume2, Bell, Radio, Check, AlertCircle, RefreshCw,
  Plus, Trash2, Edit2, Play, VolumeX, Sparkles, ExternalLink, Activity,
  Sun, Moon, Globe, Folder, FolderPlus, Tag, Layers, Mic, AlertTriangle
} from 'lucide-react';
import { useThemeLang } from '../context/ThemeLanguageContext';
import AdminVoiceRecorder from './AdminVoiceRecorder';
import PublicWorkspace from './PublicWorkspace';
import IconPicker, { renderAppIcon } from './IconPicker';

export default function AdminApp() {
  const { theme, toggleTheme, lang, toggleLang, t } = useThemeLang();

  const [token, setToken] = useState(() => localStorage.getItem('kernelping_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace' | 'settings' | 'categories' | 'presets' | 'audit'

  // Admin Data State
  const [settings, setSettings] = useState({
    spam_cooldown_enabled: true,
    cooldown_seconds: 15,
    pre_chime_enabled: true,
    chime_tone: 'airport',
    chime_volume: 80,
    bluetooth_wakeup_enabled: true,
    server_volume: 85,
    tts_voice_ar: 'ar-SY-LaithNeural',
    tts_voice_en: 'en-US-AriaNeural'
  });
  const [categories, setCategories] = useState([]);
  const [presets, setPresets] = useState([]);
  const [testingVoice, setTestingVoice] = useState({ ar: false, en: false });
  const [auditData, setAuditData] = useState({
    total_announcements: 0,
    sources_breakdown: {},
    recent_entries: []
  });

  // Audit deletion confirmation modal state
  const [auditToDelete, setAuditToDelete] = useState(null);
  const [showClearAllAuditModal, setShowClearAllAuditModal] = useState(false);
  const [isReconnectingSpeaker, setIsReconnectingSpeaker] = useState(false);

  // Category Modals
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name_ar: '',
    name_en: '',
    icon: 'Folder',
    color: 'cyan',
    order: 0
  });

  // Preset Modals (Single Title & Single Text)
  const [isAddPresetOpen, setIsAddPresetOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [presetForm, setPresetForm] = useState({
    id: '',
    category_id: 'uncategorized',
    title: '',
    text: '',
    icon: 'Volume2',
    color: 'cyan'
  });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Check auth token on mount
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
      // 1. Settings
      const sRes = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (sRes.ok) {
        const data = await sRes.json();
        setSettings(data.settings);
      }

      // 2. Categories
      const cRes = await fetch('/api/admin/categories', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (cRes.ok) {
        const cData = await cRes.json();
        setCategories(cData);
      }

      // 3. Presets
      const pRes = await fetch('/api/admin/presets', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        setPresets(pData);
      }

      // 4. Audit
      const aRes = await fetch('/api/admin/audit', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (aRes.ok) {
        const aData = await aRes.json();
        setAuditData(aData);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kernelping_token');
    setToken('');
    setIsAuthenticated(false);
  };

  const handleTestVoice = async (voice, langCode) => {
    setTestingVoice(prev => ({ ...prev, [langCode]: true }));
    try {
      const res = await fetch('/api/admin/test-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ voice, lang: langCode })
      });
      if (res.ok) {
        showToast('Playing voice sample', 'success');
      }
    } catch {
      showToast('Error playing voice sample', 'error');
    } finally {
      setTimeout(() => {
        setTestingVoice(prev => ({ ...prev, [langCode]: false }));
      }, 3000);
    }
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
        showToast(`Playing ${tone} chime`, 'success');
      }
    } catch {
      showToast('Error testing chime', 'error');
    }
  };

  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updated)
      });
    } catch {
      showToast('Error saving setting', 'error');
    }
  };

  const handleVolumeChange = async (newVol) => {
    const v = parseInt(newVol, 10);
    setSettings(prev => ({ ...prev, server_volume: v }));
    try {
      await fetch('/api/admin/volume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ volume: v })
      });
    } catch {
      showToast('Error adjusting volume', 'error');
    }
  };

  // Helper to detect language for live UI indicator
  const isArabicText = (text) => {
    const arCount = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
    const enCount = (text.match(/[a-zA-Z]/g) || []).length;
    return arCount >= enCount;
  };

  // --- Category CRUD Actions ---
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.id.trim() || !categoryForm.name_ar.trim()) {
      showToast('Please fill required fields', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(categoryForm)
      });
      if (res.ok) {
        showToast('Category added successfully', 'success');
        setIsAddCategoryOpen(false);
        setCategoryForm({
          id: '',
          name_ar: '',
          name_en: '',
          icon: 'Folder',
          color: 'cyan',
          order: 0
        });
        loadAdminData();
      } else {
        const d = await res.json();
        showToast(d.detail || 'Error creating category', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleUpdateCategory = async (cat) => {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(cat)
      });
      if (res.ok) {
        showToast('Category updated successfully', 'success');
        setEditingCategory(null);
        loadAdminData();
      } else {
        const d = await res.json();
        showToast(d.detail || 'Error updating category', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm(t.confirmDeleteCategory)) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Category deleted', 'success');
        loadAdminData();
      } else {
        showToast('Error deleting category', 'error');
      }
    } catch {
      showToast('Error deleting category', 'error');
    }
  };

  // --- Preset CRUD Actions (Single Title & Single Text) ---
  const handleCreatePreset = async (e) => {
    e.preventDefault();
    if (!presetForm.id.trim() || !presetForm.title.trim() || !presetForm.text.trim()) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    try {
      const payload = {
        id: presetForm.id.trim(),
        category_id: presetForm.category_id || 'uncategorized',
        title: presetForm.title.trim(),
        title_ar: presetForm.title.trim(),
        title_en: presetForm.title.trim(),
        text: presetForm.text.trim(),
        text_ar: presetForm.text.trim(),
        text_en: presetForm.text.trim(),
        icon: presetForm.icon || 'Volume2',
        color: presetForm.color || 'cyan',
        category: presetForm.category_id === 'uncategorized' 
          ? 'Uncategorized' 
          : (categories.find(c => c.id === presetForm.category_id)?.name_ar || 'Uncategorized')
      };

      const res = await fetch('/api/admin/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Preset created and audio cached', 'success');
        setIsAddPresetOpen(false);
        setPresetForm({
          id: '',
          category_id: 'uncategorized',
          title: '',
          text: '',
          icon: 'Volume2',
          color: 'cyan'
        });
        loadAdminData();
      } else {
        const d = await res.json();
        showToast(d.detail || 'Error creating preset', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleUpdatePreset = async (preset) => {
    try {
      const title = preset.title || preset.title_ar || preset.title_en || preset.id;
      const text = preset.text || preset.text_ar || preset.text_en || '';

      const payload = {
        ...preset,
        title: title,
        title_ar: title,
        title_en: title,
        text: text,
        text_ar: text,
        text_en: text,
        category: preset.category_id === 'uncategorized' 
          ? 'Uncategorized' 
          : (categories.find(c => c.id === preset.category_id)?.name_ar || preset.category || 'Uncategorized')
      };

      const res = await fetch(`/api/admin/presets/${preset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Preset updated successfully', 'success');
        setEditingPreset(null);
        loadAdminData();
      } else {
        showToast('Error updating preset', 'error');
      }
    } catch {
      showToast('Error updating preset', 'error');
    }
  };

  const handleDeletePreset = async (id) => {
    if (!window.confirm('Delete this preset permanently?')) return;
    try {
      const res = await fetch(`/api/admin/presets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Preset deleted', 'success');
        loadAdminData();
      } else {
        showToast('Error deleting preset', 'error');
      }
    } catch {
      showToast('Error deleting preset', 'error');
    }
  };

  const handleRebuildSingleCache = async (id) => {
    try {
      const res = await fetch(`/api/admin/presets/${id}/rebuild-cache`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Audio cache rebuilt', 'success');
        loadAdminData();
      }
    } catch {
      showToast('Error rebuilding cache', 'error');
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
        showToast('All audio caches rebuilt', 'success');
        loadAdminData();
      } else {
        showToast('Error rebuilding all caches', 'error');
      }
    } catch {
      showToast('Error rebuilding all caches', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Audit Log Deletion with Confirmation Dialog (Requirement 5) ---
  const handleConfirmDeleteAuditEntry = async () => {
    if (!auditToDelete) return;
    try {
      const res = await fetch(`/api/admin/audit/${auditToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Log entry deleted successfully', 'success');
        setAuditToDelete(null);
        loadAdminData();
      } else {
        showToast('Error deleting audit log entry', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleConfirmClearAllAudit = async () => {
    try {
      const res = await fetch('/api/admin/audit', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('All audit logs cleared successfully', 'success');
        setShowClearAllAuditModal(false);
        loadAdminData();
      } else {
        showToast('Error clearing logs', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  // Render Login Screen if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={(newToken) => {
      localStorage.setItem('kernelping_token', newToken);
      setToken(newToken);
      setIsAuthenticated(true);
      loadAdminData(newToken);
    }} />;
  }

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

      {/* Confirmation Modal for Single Audit Deletion (Requirement 5) */}
      {auditToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className={`border rounded-3xl w-full max-w-md p-6 shadow-2xl transition-all ${
            theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 mb-4 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-base">{t.confirmDeleteAuditTitle}</h3>
                <p className="text-xs opacity-75">{auditToDelete.timestamp}</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed mb-4 opacity-80">
              {t.confirmDeleteAuditMessage}
            </p>

            <div className={`p-3.5 rounded-2xl border text-xs mb-6 ${
              theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152]' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className="font-bold mb-1 text-cyan-400">{auditToDelete.title}</p>
              <p className="opacity-80 italic line-clamp-2">"{auditToDelete.text}"</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAuditToDelete(null)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  theme === 'dark' ? 'bg-[#162238] hover:bg-[#1F3152] text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAuditEntry}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all"
              >
                {t.confirmDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing All Audit Logs */}
      {showClearAllAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className={`border rounded-3xl w-full max-w-md p-6 shadow-2xl ${
            theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 mb-4 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="font-bold text-base">{t.confirmClearAuditTitle}</h3>
            </div>

            <p className="text-xs leading-relaxed mb-6 opacity-80">
              {t.confirmClearAuditMessage}
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearAllAuditModal(false)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold ${
                  theme === 'dark' ? 'bg-[#162238] text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAllAudit}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30"
              >
                {t.confirmClearAllBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Top Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-lg border-b px-4 lg:px-8 py-3.5 shadow-xl transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#0B132B]/90 border-[#1F3152]' : 'bg-white/90 border-slate-200 shadow-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center p-1.5 bg-white border border-slate-200/60 shadow-sm transition-all">
              <img src="/logo.png" alt="Kernel Ping Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-base font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Kernel Ping Center
                </h1>
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {t.adminSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
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

            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-[#121C33] border-[#1F3152] text-[#00D2FF] hover:bg-[#1C2A47]'
                  : 'bg-slate-100 border-slate-200 text-sky-700 hover:bg-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t.langToggle}</span>
            </button>

            {/* Back to Public View */}
            <button
              onClick={() => { window.location.href = '/'; }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                theme === 'dark'
                  ? 'bg-[#162238] hover:bg-[#1F3152] text-slate-300 border-[#1F3152]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <span>{t.backToPublic}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${lang === 'en' ? '' : 'rotate-180'}`} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.logout}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Admin Navigation Tabs (Includes Workspace & Live Broadcast as Tab 1) */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-6">
        <div className={`flex items-center gap-2 border-b pb-3 overflow-x-auto ${
          theme === 'dark' ? 'border-[#1F3152]' : 'border-slate-200'
        }`}>
          {[
            { id: 'workspace', label: t.tabLiveWorkspace, icon: Radio },
            { id: 'settings', label: t.tabAudio, icon: Sliders },
            { id: 'categories', label: t.tabCategories, icon: Layers },
            { id: 'presets', label: t.tabPresets, icon: Database },
            { id: 'audit', label: t.tabAudit, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? theme === 'dark'
                      ? 'bg-[#00D2FF] text-slate-950 shadow-md shadow-[#00D2FF]/20 font-black'
                      : 'bg-sky-600 text-white shadow-md shadow-sky-600/20 font-black'
                    : theme === 'dark'
                      ? 'text-slate-400 hover:text-white hover:bg-[#162238]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Panels */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-6">
        
        {/* TAB 1: INTEGRATED MAIN WORKSPACE + LIVE VOICE BROADCAST (Requirement 7) */}
        {activeTab === 'workspace' && (
          <div>
            <PublicWorkspace
              isEmbedded={true}
              extraAdminContent={
                <AdminVoiceRecorder
                  token={token}
                  onBroadcastSuccess={(msg) => showToast(msg, 'success')}
                />
              }
            />
          </div>
        )}

        {/* TAB 2: AUDIO SETTINGS */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Server Output & Voices */}
            <div className={`border rounded-3xl p-6 shadow-xl space-y-6 transition-colors duration-200 ${
              theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 shadow-slate-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-5 h-5 text-[#00D2FF]" />
                <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t.serverVolumeTitle}
                </h3>
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {t.serverVolumeDesc}
              </p>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {t.volume} (wpctl):
                  </span>
                  <span className="text-sm font-mono font-bold text-[#00D2FF]">{settings.server_volume}%</span>
                </div>
                <div dir="ltr" className="w-full space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.server_volume}
                    onChange={(e) => handleVolumeChange(e.target.value)}
                    style={{
                      background: `linear-gradient(to right, #00D2FF 0%, #00D2FF ${settings.server_volume}%, ${theme === 'dark' ? '#1E293B' : '#E2E8F0'} ${settings.server_volume}%, ${theme === 'dark' ? '#1E293B' : '#E2E8F0'} 100%)`
                    }}
                    className="w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
                  />
                  <div className="flex justify-between gap-1.5">
                    {[0, 25, 50, 75, 100].map((v) => (
                      <button
                        key={v}
                        onClick={() => handleVolumeChange(v)}
                        className={`text-[11px] font-mono px-2.5 py-1 rounded-xl transition-colors ${
                          settings.server_volume === v
                            ? 'bg-[#00D2FF] text-slate-950 font-bold shadow-sm'
                            : theme === 'dark' ? 'bg-[#162238] hover:bg-[#1F3152] text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Neural Voices (Arabic & English) */}
              <div className={`pt-4 border-t space-y-4 ${theme === 'dark' ? 'border-[#1F3152]' : 'border-slate-200'}`}>
                <h4 className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t.voiceSettingsTitle}
                </h4>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t.voiceArLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTestVoice(settings.tts_voice_ar, 'ar')}
                      disabled={testingVoice.ar}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border flex items-center gap-1 transition-all ${
                        theme === 'dark'
                          ? 'bg-[#162238] hover:bg-[#1F3152] text-[#00D2FF] border-[#1F3152]'
                          : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
                      }`}
                    >
                      <Volume2 className={`w-3 h-3 ${testingVoice.ar ? 'animate-pulse' : ''}`} />
                      <span>{testingVoice.ar ? t.testingVoice : t.testVoiceBtn}</span>
                    </button>
                  </div>
                  <select
                    value={settings.tts_voice_ar}
                    onChange={(e) => updateSetting('tts_voice_ar', e.target.value)}
                    className={`w-full border rounded-2xl px-3.5 py-2 text-xs transition-all focus:outline-none ${
                      theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
                    }`}
                  >
                    <option value="ar-SY-LaithNeural">ar-SY-LaithNeural (Laith - Broadcast Standard)</option>
                    <option value="ar-SA-HamedNeural">ar-SA-HamedNeural (Hamed - Calm & Crisp)</option>
                    <option value="ar-AE-HamdanNeural">ar-AE-HamdanNeural (Hamdan - Official Tone)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t.voiceEnLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTestVoice(settings.tts_voice_en, 'en')}
                      disabled={testingVoice.en}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border flex items-center gap-1 transition-all ${
                        theme === 'dark'
                          ? 'bg-[#162238] hover:bg-[#1F3152] text-[#00D2FF] border-[#1F3152]'
                          : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
                      }`}
                    >
                      <Volume2 className={`w-3 h-3 ${testingVoice.en ? 'animate-pulse' : ''}`} />
                      <span>{testingVoice.en ? t.testingVoice : t.testVoiceBtn}</span>
                    </button>
                  </div>
                  <select
                    value={settings.tts_voice_en}
                    onChange={(e) => updateSetting('tts_voice_en', e.target.value)}
                    className={`w-full border rounded-2xl px-3.5 py-2 text-xs transition-all focus:outline-none ${
                      theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
                    }`}
                  >
                    <option value="en-US-BrianMultilingualNeural">en-US-BrianMultilingualNeural (Brian - Approachable & Crisp)</option>
                    <option value="en-US-AriaNeural">en-US-AriaNeural (Aria - Crystal Clear & Professional)</option>
                    <option value="en-US-AndrewMultilingualNeural">en-US-AndrewMultilingualNeural (Andrew - Warm & Confident)</option>
                    <option value="en-US-AvaMultilingualNeural">en-US-AvaMultilingualNeural (Ava - Expressive & Pleasant)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Chime & Bluetooth Settings (Includes Chime Volume Slider) */}
            <div className={`border rounded-3xl p-6 shadow-xl space-y-6 transition-colors duration-200 ${
              theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 shadow-slate-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <Bell className="w-5 h-5 text-amber-500" />
                <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t.chimeSettingsTitle}
                </h3>
              </div>

              {/* Pre-Chime Toggle */}
              <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                theme === 'dark' ? 'bg-[#121C33] border-[#1F3152]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <h4 className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {t.preChimeLabel}
                  </h4>
                  <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.preChimeDesc}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pre_chime_enabled}
                  onChange={(e) => updateSetting('pre_chime_enabled', e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer accent-[#00D2FF]"
                />
              </div>

              {/* Chime Tone Selector */}
              {settings.pre_chime_enabled && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t.chimeToneLabel}
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'airport', name: 'Airport' },
                        { id: 'bell', name: 'Bell' },
                        { id: 'alert', name: 'Alert' }
                      ].map((tone) => (
                        <div
                          key={tone.id}
                          className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                            settings.chime_tone === tone.id
                              ? 'bg-[#00D2FF]/10 border-[#00D2FF] text-[#00D2FF] font-black'
                              : theme === 'dark'
                                ? 'bg-[#121C33] border-[#1F3152] text-slate-300 hover:border-slate-500'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                          }`}
                          onClick={() => updateSetting('chime_tone', tone.id)}
                        >
                          <span className="text-xs block mb-1 font-bold">{tone.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestChime(tone.id);
                            }}
                            className={`text-[10px] underline ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            {t.testTone}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chime Volume Slider (Image 2 Fix - Synchronized LTR track & buttons) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {t.chimeVolumeLabel}
                      </label>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {settings.chime_volume ?? 80}%
                      </span>
                    </div>

                    <div dir="ltr" className="w-full space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.chime_volume ?? 80}
                        onChange={(e) => updateSetting('chime_volume', Number(e.target.value))}
                        style={{
                          background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${settings.chime_volume ?? 80}%, ${theme === 'dark' ? '#1E293B' : '#E2E8F0'} ${settings.chime_volume ?? 80}%, ${theme === 'dark' ? '#1E293B' : '#E2E8F0'} 100%)`
                        }}
                        className="w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                      <div className="flex justify-between gap-1.5">
                        {[0, 25, 50, 75, 100].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => updateSetting('chime_volume', v)}
                            className={`text-[11px] font-mono px-2.5 py-1 rounded-xl transition-colors ${
                              (settings.chime_volume ?? 80) === v
                                ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                                : theme === 'dark' ? 'bg-[#162238] text-slate-300 hover:bg-[#1F3152]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {v}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bluetooth Wake-up Ping */}
              <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                theme === 'dark' ? 'bg-[#121C33] border-[#1F3152]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <h4 className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {t.bluetoothWakeupLabel}
                  </h4>
                  <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.bluetoothWakeupDesc}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.bluetooth_wakeup_enabled}
                  onChange={(e) => updateSetting('bluetooth_wakeup_enabled', e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer accent-[#00D2FF]"
                />
              </div>

              {/* Spam Cooldown (Enforces cooldown on both presets and free text) */}
              <div className={`pt-4 border-t space-y-3 ${theme === 'dark' ? 'border-[#1F3152]' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {t.cooldownSettingsTitle}
                    </h4>
                    <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t.cooldownToggleLabel}
                    </p>
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
                      <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{t.cooldownDurationLabel}</span>
                      <span className="font-mono text-[#00D2FF] font-bold">{settings.cooldown_seconds} {t.secondsUnit}</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={settings.cooldown_seconds}
                      onChange={(e) => updateSetting('cooldown_seconds', parseInt(e.target.value, 10))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
                    />
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-4 ${
              theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 shadow-slate-100'
            }`}>
              <div>
                <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t.categoriesTitle}
                </h3>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.categoriesDesc}
                </p>
              </div>

              <button
                onClick={() => setIsAddCategoryOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#00D2FF] hover:bg-[#33DCFF] text-slate-950 text-xs font-bold shadow-md shadow-[#00D2FF]/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addCategoryBtn}</span>
              </button>
            </div>

            {/* Categories Table */}
            <div className={`border rounded-3xl overflow-hidden shadow-xl ${
              theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className={`border-b font-bold ${
                    theme === 'dark' ? 'bg-[#121C33] text-slate-300 border-[#1F3152]' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-4">{t.catIdCol}</th>
                      <th className="py-3.5 px-4">{t.catNameArCol}</th>
                      <th className="py-3.5 px-4">{t.catNameEnCol}</th>
                      <th className="py-3.5 px-4">{t.catIconCol}</th>
                      <th className="py-3.5 px-4">{t.catColorCol}</th>
                      <th className="py-3.5 px-4">{t.catPresetsCountCol}</th>
                      <th className="py-3.5 px-4 text-center">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-[#1F3152] text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                    {categories.map((cat) => {
                      const count = presets.filter(p => 
                        p.category_id === cat.id || 
                        p.category === cat.name_ar ||
                        (cat.id === 'uncategorized' && (!p.category_id || p.category_id === 'uncategorized'))
                      ).length;
                      return (
                        <tr key={cat.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-[#121C33]/50' : 'hover:bg-slate-50'}`}>
                          <td className="py-3.5 px-4 font-mono font-bold text-sky-500">{cat.id}</td>
                          <td className="py-3.5 px-4 font-bold">{cat.name_ar}</td>
                          <td className="py-3.5 px-4 font-medium">{cat.name_en}</td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">{cat.icon}</td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">{cat.color}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              theme === 'dark' ? 'bg-[#162238] text-slate-300' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {count}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                              {cat.id !== 'uncategorized' && (
                                <>
                                  <button
                                    onClick={() => setEditingCategory(cat)}
                                    className={`p-1.5 rounded-xl border transition-colors ${
                                      theme === 'dark' ? 'bg-[#162238] hover:bg-[#1F3152] text-slate-300 border-[#1F3152]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                    }`}
                                    title={t.edit}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 transition-colors"
                                    title={t.delete}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Add Category */}
            {isAddCategoryOpen && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className={`border rounded-3xl w-full max-w-md p-6 shadow-2xl ${
                  theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <h3 className="font-bold text-base mb-4">{t.addCategoryModalTitle}</h3>
                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Category ID:</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. mobile_dev"
                        value={categoryForm.id}
                        onChange={(e) => setCategoryForm({ ...categoryForm, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        className={`w-full border rounded-2xl px-3.5 py-2 text-xs font-mono focus:outline-none ${
                          theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Arabic Name:</label>
                      <input
                        type="text"
                        required
                        placeholder="Mobile Development (Arabic)"
                        value={categoryForm.name_ar}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name_ar: e.target.value })}
                        className={`w-full border rounded-2xl px-3.5 py-2 text-xs focus:outline-none ${
                          theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">English Name:</label>
                      <input
                        type="text"
                        required
                        placeholder="Mobile Development"
                        value={categoryForm.name_en}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name_en: e.target.value })}
                        className={`w-full border rounded-2xl px-3.5 py-2 text-xs focus:outline-none ${
                          theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                        }`}
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddCategoryOpen(false)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold ${
                          theme === 'dark' ? 'bg-[#162238] text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-2xl bg-[#00D2FF] text-slate-950 font-bold text-xs shadow-md shadow-[#00D2FF]/20"
                      >
                        {t.saveChanges}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Edit Category */}
            {editingCategory && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className={`border rounded-3xl w-full max-w-md p-6 shadow-2xl ${
                  theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <h3 className="font-bold text-base mb-4">{t.editCategoryModalTitle}: {editingCategory.id}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Arabic Name:</label>
                      <input
                        type="text"
                        value={editingCategory.name_ar}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name_ar: e.target.value })}
                        className={`w-full border rounded-2xl px-3.5 py-2 text-xs focus:outline-none ${
                          theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">English Name:</label>
                      <input
                        type="text"
                        value={editingCategory.name_en}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name_en: e.target.value })}
                        className={`w-full border rounded-2xl px-3.5 py-2 text-xs focus:outline-none ${
                          theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                        }`}
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold ${
                          theme === 'dark' ? 'bg-[#162238] text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCategory(editingCategory)}
                        className="px-5 py-2 rounded-2xl bg-[#00D2FF] text-slate-950 font-bold text-xs shadow-md shadow-[#00D2FF]/20"
                      >
                        {t.saveChanges}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PRESETS CRUD (Single Title, Single Text, Uncategorized Option) */}
        {activeTab === 'presets' && (
          <div className="space-y-6">
            <div className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-4 ${
              theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 shadow-slate-100'
            }`}>
              <div>
                <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t.presetsAdminTitle}
                </h3>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.presetsAdminDesc}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleRebuildAllCache}
                  disabled={loading}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-colors ${
                    theme === 'dark'
                      ? 'bg-[#162238] hover:bg-[#1F3152] text-[#00D2FF] border-[#1F3152]'
                      : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{t.rebuildAllCacheBtn}</span>
                </button>

                <button
                  onClick={() => setIsAddPresetOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#00D2FF] hover:bg-[#33DCFF] text-slate-950 text-xs font-bold shadow-md shadow-[#00D2FF]/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addPresetBtn}</span>
                </button>
              </div>
            </div>

            {/* Presets Table */}
            <div className={`border rounded-3xl overflow-hidden shadow-xl ${
              theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className={`border-b font-bold ${
                    theme === 'dark' ? 'bg-[#121C33] text-slate-300 border-[#1F3152]' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-4">{t.presetIdCol}</th>
                      <th className="py-3.5 px-4">{t.presetTitleCol}</th>
                      <th className="py-3.5 px-4">{t.presetCategoryCol}</th>
                      <th className="py-3.5 px-4">{t.presetTextCol}</th>
                      <th className="py-3.5 px-4">{t.presetCacheCol}</th>
                      <th className="py-3.5 px-4 text-center">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-[#1F3152] text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                    {presets.map((preset) => {
                      const title = preset.title || preset.title_ar || preset.title_en || preset.id;
                      const text = preset.text || preset.text_ar || preset.text_en || '';
                      const isUncat = !preset.category_id || preset.category_id === 'uncategorized';

                      return (
                        <tr key={preset.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-[#121C33]/50' : 'hover:bg-slate-50'}`}>
                          <td className="py-3.5 px-4 font-mono font-bold text-sky-500">{preset.id}</td>
                          <td className="py-3.5 px-4 font-bold">{title}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isUncat 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            }`}>
                              {isUncat ? t.uncategorized : (categories.find(c => c.id === preset.category_id)?.name_ar || preset.category)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-sm truncate text-slate-400">"{text}"</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Ready
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleRebuildSingleCache(preset.id)}
                                className={`p-1.5 rounded-xl border transition-colors ${
                                  theme === 'dark' ? 'bg-[#162238] hover:bg-[#1F3152] text-cyan-400 border-[#1F3152]' : 'bg-slate-100 hover:bg-slate-200 text-sky-700 border-slate-200'
                                }`}
                                title={t.rebuildPresetCacheBtn}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingPreset(preset)}
                                className={`p-1.5 rounded-xl border transition-colors ${
                                  theme === 'dark' ? 'bg-[#162238] hover:bg-[#1F3152] text-slate-300 border-[#1F3152]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                                title={t.edit}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePreset(preset.id)}
                                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 transition-colors"
                                title={t.delete}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Add Preset (Single Title & Single Text, Uncategorized Option) */}
            {isAddPresetOpen && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className={`border rounded-3xl w-full max-w-lg p-6 shadow-2xl ${
                  theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <h3 className="font-bold text-base mb-4">{t.addPresetModalTitle}</h3>
                  <form onSubmit={handleCreatePreset} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">{t.presetIdCol}:</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. daily_sync"
                          value={presetForm.id}
                          onChange={(e) => setPresetForm({ ...presetForm, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                          className={`w-full border rounded-2xl px-3.5 py-2 text-xs font-mono focus:outline-none ${
                            theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">{t.presetCategoryCol}:</label>
                        <select
                          value={presetForm.category_id}
                          onChange={(e) => setPresetForm({ ...presetForm, category_id: e.target.value })}
                          className={`w-full border rounded-2xl px-3.5 py-2 text-xs focus:outline-none ${
                            theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                          }`}
                        >
                          <option value="uncategorized">{t.uncategorized}</option>
                          {categories.filter(c => c.id !== 'uncategorized').map((c) => (
                            <option key={c.id} value={c.id}>{lang === 'en' ? c.name_en : c.name_ar}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Single Title Input Field */}
                    <div>
                      <label className="block text-xs font-semibold mb-1">{t.singleTitleLabel}</label>
                      <input
                        type="text"
                        required
                        placeholder={t.singleTitlePlaceholder}
                        value={presetForm.title}
                        onChange={(e) => setPresetForm({ ...presetForm, title: e.target.value })}
                        className={`w-full border rounded-2xl px-3.5 py-2 text-xs focus:outline-none ${
                          theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                        }`}
                      />
                    </div>

                    {/* Single Spoken Textarea Field */}
                    <div>
                      <label className="block text-xs font-semibold mb-1">{t.singleTextLabel}</label>
                      <textarea
                        rows={3}
                        required
                        placeholder={t.singleTextPlaceholder}
                        value={presetForm.text}
                        onChange={(e) => setPresetForm({ ...presetForm, text: e.target.value })}
                        className={`w-full border rounded-2xl p-3 text-xs focus:outline-none ${
                          theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                        }`}
                      />

                      {/* Live Language Engine Detection Badge */}
                      {presetForm.text.trim() && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
                          <span>🌐</span>
                          <span>
                            {isArabicText(presetForm.text) ? t.engineArNotice : t.engineEnNotice}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Icon Selection */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">{t.selectIconLabel}</label>
                      <IconPicker
                        selectedIcon={presetForm.icon || 'Volume2'}
                        onSelectIcon={(icon) => setPresetForm({ ...presetForm, icon })}
                        theme={theme}
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddPresetOpen(false)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold ${
                          theme === 'dark' ? 'bg-[#162238] text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-2xl bg-[#00D2FF] text-slate-950 font-bold text-xs shadow-md shadow-[#00D2FF]/20"
                      >
                        {t.saveChanges}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Edit Preset (Single Title & Single Text, Uncategorized Option) */}
            {editingPreset && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className={`border rounded-3xl w-full max-w-lg p-6 shadow-2xl ${
                  theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <h3 className="font-bold text-base mb-4">{t.editPresetModalTitle}: {editingPreset.id}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">{t.presetCategoryCol}:</label>
                      <select
                        value={editingPreset.category_id || 'uncategorized'}
                        onChange={(e) => setEditingPreset({ ...editingPreset, category_id: e.target.value })}
                        className={`w-full border rounded-2xl px-3.5 py-2 text-xs focus:outline-none ${
                          theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                        }`}
                      >
                        <option value="uncategorized">{t.uncategorized}</option>
                        {categories.filter(c => c.id !== 'uncategorized').map((c) => (
                          <option key={c.id} value={c.id}>{lang === 'en' ? c.name_en : c.name_ar}</option>
                        ))}
                      </select>
                    </div>

                    {/* Single Title Input */}
                    <div>
                      <label className="block text-xs font-semibold mb-1">{t.singleTitleLabel}</label>
                      <input
                        type="text"
                        value={editingPreset.title || editingPreset.title_ar || editingPreset.title_en || ''}
                        onChange={(e) => setEditingPreset({ ...editingPreset, title: e.target.value })}
                        className={`w-full border rounded-2xl px-3.5 py-2 text-xs focus:outline-none ${
                          theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                        }`}
                      />
                    </div>

                    {/* Single Text Input */}
                    <div>
                      <label className="block text-xs font-semibold mb-1">{t.singleTextLabel}</label>
                      <textarea
                        rows={3}
                        value={editingPreset.text || editingPreset.text_ar || editingPreset.text_en || ''}
                        onChange={(e) => setEditingPreset({ ...editingPreset, text: e.target.value })}
                        className={`w-full border rounded-2xl p-3 text-xs focus:outline-none ${
                          theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                        }`}
                      />

                      {/* Live Language Engine Detection Badge */}
                      {(editingPreset.text || '').trim() && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
                          <span>🌐</span>
                          <span>
                            {isArabicText(editingPreset.text || '') ? t.engineArNotice : t.engineEnNotice}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Icon Selection */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">{t.selectIconLabel}</label>
                      <IconPicker
                        selectedIcon={editingPreset.icon || 'Volume2'}
                        onSelectIcon={(icon) => setEditingPreset({ ...editingPreset, icon })}
                        theme={theme}
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingPreset(null)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold ${
                          theme === 'dark' ? 'bg-[#162238] text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdatePreset(editingPreset)}
                        className="px-5 py-2 rounded-2xl bg-[#00D2FF] text-slate-950 font-bold text-xs shadow-md shadow-[#00D2FF]/20"
                      >
                        {t.saveChanges}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 5: AUDIT TRAIL (With Deletion Confirmation Dialogs) */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-5 rounded-3xl border shadow-xl ${
                theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200'
              }`}>
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.totalCalls}</span>
                <p className="text-2xl font-mono font-black text-[#00D2FF] mt-1">
                  {auditData.total_announcements}
                </p>
              </div>
              <div className={`p-5 rounded-3xl border shadow-xl ${
                theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200'
              }`}>
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.presetCalls}</span>
                <p className="text-2xl font-mono font-black text-emerald-500 mt-1">
                  {auditData.sources_breakdown?.preset || 0}
                </p>
              </div>
              <div className={`p-5 rounded-3xl border shadow-xl ${
                theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200'
              }`}>
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.customCalls}</span>
                <p className="text-2xl font-mono font-black text-amber-500 mt-1">
                  {(auditData.sources_breakdown?.free_text || 0) + (auditData.sources_breakdown?.device_call || 0) + (auditData.sources_breakdown?.admin_voice || 0)}
                </p>
              </div>
            </div>

            <div className={`border rounded-3xl overflow-hidden shadow-xl ${
              theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200'
            }`}>
              <div className={`p-4 border-b flex items-center justify-between ${
                theme === 'dark' ? 'border-[#1F3152]' : 'border-slate-200'
              }`}>
                <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.auditTitle}</h3>
                <div className="flex items-center gap-3">
                  {auditData.recent_entries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearAllAuditModal(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.clearAllAuditBtn}</span>
                    </button>
                  )}
                  <span className="text-xs text-slate-400 font-mono">Live Sync</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className={`border-b font-bold ${
                    theme === 'dark' ? 'bg-[#121C33] text-slate-300 border-[#1F3152]' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-4">{t.auditTimeCol}</th>
                      <th className="py-3.5 px-4">{t.auditTitleCol}</th>
                      <th className="py-3.5 px-4">{t.auditTypeCol}</th>
                      <th className="py-3.5 px-4">{t.auditTextCol}</th>
                      <th className="py-3.5 px-4">{t.auditLangCol}</th>
                      <th className="py-3.5 px-4">{t.auditIpCol}</th>
                      <th className="py-3.5 px-4 text-center">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-[#1F3152] text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                    {auditData.recent_entries.map((log) => (
                      <tr key={log.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-[#121C33]/50' : 'hover:bg-slate-50'}`}>
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                        <td className="py-3 px-4 font-bold whitespace-nowrap">{log.title}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.source === 'preset' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30' :
                            log.source === 'device_call' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' :
                            log.source === 'admin_voice' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
                            'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                          }`}>
                            {log.source === 'preset' ? 'Preset' : log.source === 'device_call' ? 'Call' : log.source === 'admin_voice' ? 'Live Voice' : 'Custom'}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-md truncate">{log.text}</td>
                        <td className="py-3 px-4 font-mono uppercase text-[10px] font-bold text-sky-500">{log.language || 'AR'}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{log.sender_ip}</td>
                        <td className="py-3 px-4 text-center">
                          {/* Triggers Confirmation Modal */}
                          <button
                            type="button"
                            onClick={() => setAuditToDelete(log)}
                            title={t.deleteEntryBtn}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {auditData.recent_entries.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          {t.noAuditYet}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// Standalone Secure Login Screen for /admin
function AdminLogin({ onLoginSuccess }) {
  const { theme, lang, t } = useThemeLang();
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
        setError(data.detail || t.loginError);
      }
    } catch {
      setError(t.errorNetwork);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#070C1B]' : 'bg-[#F8FAFC]'
    }`}>
      <div className={`w-full max-w-md border rounded-3xl p-8 shadow-2xl relative overflow-hidden ${
        theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 shadow-slate-200'
      }`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D2FF]/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3.5 p-2 bg-white border border-slate-200/60 shadow-sm transition-all">
            <img src="/logo.png" alt="Kernel Ping Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {t.loginTitle}
          </h2>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.loginSubtitle}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              {t.usernameLabel}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs font-mono transition-all focus:outline-none ${
                theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              {t.passwordLabel}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs font-mono transition-all focus:outline-none ${
                theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:from-[#33DCFF] hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-[#00D2FF]/20 transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" />
            <span>{loading ? t.loginChecking : t.loginButton}</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-400 font-mono">
            {t.defaultCredentialsNotice}
          </p>
        </div>
      </div>
    </div>
  );
}
