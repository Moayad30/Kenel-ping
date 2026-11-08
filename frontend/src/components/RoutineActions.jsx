import React, { useState, useEffect } from 'react';
import {
  Laptop, Plus, Trash2, Edit2, Volume2, X, RefreshCw, Activity, Clock
} from 'lucide-react';
import { useThemeLang } from '../context/ThemeLanguageContext';
import IconPicker, { renderAppIcon } from './IconPicker';

export default function RoutineActions({ onRoutineSpoke, onStartSpeaking, cooldownRemaining = 0, isSpeaking = false }) {
  const { theme, t } = useThemeLang();

  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    template: 'Where is device #{num}?',
    default_value: '1',
    icon: 'Search',
    color: 'cyan'
  });

  useEffect(() => {
    fetchRoutines();
  }, []);

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setTemplateToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchRoutines = async () => {
    try {
      const res = await fetch('/api/routines');
      if (res.ok) {
        const data = await res.json();
        setRoutines(data);
        const initialVals = {};
        data.forEach((r) => {
          initialVals[r.id] = r.default_value || '1';
        });
        setValues((prev) => ({ ...initialVals, ...prev }));
      }
    } catch (err) {
      console.error('Error fetching routines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (id, newVal) => {
    setValues((prev) => ({ ...prev, [id]: newVal }));
  };

  const handleStep = (id, delta) => {
    const current = parseInt(values[id] || '0', 10);
    const updated = Math.max(0, current + delta);
    handleValueChange(id, String(updated));
  };

  const handleSpeak = async (routine) => {
    if (isSpeaking || cooldownRemaining > 0 || submittingId) return;
    setSubmittingId(routine.id);
    if (onStartSpeaking) onStartSpeaking();

    const val = values[routine.id] !== undefined ? values[routine.id] : routine.default_value || '1';

    try {
      const res = await fetch(`/api/routines/${routine.id}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: String(val) })
      });
      const data = await res.json();
      if (res.ok) {
        if (onRoutineSpoke) {
          const previewText = routine.template.replace('{num}', val).replace('{x}', val);
          onRoutineSpoke(`🔊 ${previewText}`);
        }
      } else {
        if (onRoutineSpoke) {
          onRoutineSpoke(data.detail || t.errorGeneric, 'error');
        }
      }
    } catch {
      if (onRoutineSpoke) {
        onRoutineSpoke(t.errorNetwork, 'error');
      }
    } finally {
      setSubmittingId(null);
    }
  };

  const openAddModal = () => {
    setEditingRoutine(null);
    setFormData({
      title: '',
      template: 'Where is device #{num}?',
      default_value: '10',
      icon: 'Search',
      color: 'cyan'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (routine) => {
    setEditingRoutine(routine);
    setFormData({
      title: routine.title || '',
      template: routine.template,
      default_value: routine.default_value || '1',
      icon: routine.icon || 'Search',
      color: routine.color || 'cyan'
    });
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      const res = await fetch(`/api/routines/${templateToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setRoutines((prev) => prev.filter((r) => r.id !== templateToDelete.id));
      }
    } catch (err) {
      console.error('Error deleting routine:', err);
    } finally {
      setTemplateToDelete(null);
    }
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formData.template.trim()) return;

    if (editingRoutine) {
      try {
        const res = await fetch(`/api/routines/${editingRoutine.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...editingRoutine,
            ...formData
          })
        });
        if (res.ok) {
          const updated = await res.json();
          setRoutines((prev) => prev.map((r) => (r.id === editingRoutine.id ? updated.routine : r)));
          setIsModalOpen(false);
        }
      } catch (err) {
        console.error('Error updating routine:', err);
      }
    } else {
      const newId = `routine_${Date.now()}`;
      try {
        const res = await fetch('/api/routines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newId,
            ...formData,
            order: routines.length + 1
          })
        });
        if (res.ok) {
          const created = await res.json();
          setRoutines((prev) => [...prev, created.routine]);
          setValues((prev) => ({ ...prev, [created.routine.id]: created.routine.default_value || '1' }));
          setIsModalOpen(false);
        }
      } catch (err) {
        console.error('Error creating routine:', err);
      }
    }
  };

  const isActionBlocked = isSpeaking || cooldownRemaining > 0;

  return (
    <section className={`border rounded-3xl p-5 sm:p-6 shadow-xl transition-all h-full flex flex-col justify-between ${
      theme === 'dark' ? 'bg-[#0B132B]/85 border-[#1F3152]' : 'bg-white border-slate-200 shadow-slate-100'
    }`}>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-700/30 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${
              theme === 'dark' ? 'bg-[#00D2FF]/10 border-[#00D2FF]/30 text-[#00D2FF]' : 'bg-sky-50 border-sky-200 text-sky-600'
            }`}>
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`font-bold text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {t.routinesTitle}
              </h2>
              <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {t.routinesSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-md shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addRoutineBtn}</span>
          </button>
        </div>

        {/* Routine Cards Grid (Compact, Sleek, and Elegant) */}
        {loading ? (
          <div className="py-8 text-center text-xs opacity-60 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading templates...</span>
          </div>
        ) : routines.length === 0 ? (
          <div className="py-8 text-center text-xs opacity-60">
            No templates configured yet.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {routines.map((routine) => {
              const currentVal = values[routine.id] !== undefined ? values[routine.id] : routine.default_value || '1';
              const previewText = routine.template.replace('{num}', currentVal).replace('{x}', currentVal);
              const isSubmittingThis = submittingId === routine.id;

              return (
                <div
                  key={routine.id}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    theme === 'dark'
                      ? 'bg-[#070C1B]/80 border-[#1F3152] hover:border-[#00D2FF]/40'
                      : 'bg-slate-50 border-slate-200 hover:border-sky-300'
                  }`}
                >
                  {/* Left: Icon, Title, Actions, and Preview */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        {renderAppIcon(routine.icon || 'Search', { className: 'w-3 h-3' })}
                      </div>
                      <span className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                        {routine.title || previewText}
                      </span>
                      <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEditModal(routine)}
                          title={t.editRoutineBtn}
                          className="p-1 rounded text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTemplateToDelete(routine)}
                          title={t.deleteRoutineBtn}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className={`text-xs font-normal leading-relaxed break-words whitespace-normal opacity-85 ${
                      theme === 'dark' ? 'text-cyan-300' : 'text-sky-700'
                    }`}>
                      "{previewText}"
                    </p>
                  </div>

                  {/* Right: Stepper and Compact Speak Button */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {/* Stepper */}
                    <div className="flex items-center bg-slate-900/70 p-0.5 rounded-xl border border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => handleStep(routine.id, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition-all"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => handleValueChange(routine.id, e.target.value)}
                        className="w-10 text-center font-mono font-bold text-xs bg-transparent text-cyan-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleStep(routine.id, 1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center transition-all"
                      >
                        +
                      </button>
                    </div>

                    {/* Speak Button (Guarded against repeated clicks while speaking or cooldown) */}
                    <button
                      type="button"
                      onClick={() => handleSpeak(routine)}
                      disabled={isSubmittingThis || isActionBlocked}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isActionBlocked
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-cyan-500/20 hover:scale-105 active:scale-95'
                      }`}
                    >
                      {isSubmittingThis ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : isSpeaking ? (
                        <Activity className="w-3.5 h-3.5 animate-pulse text-rose-400" />
                      ) : cooldownRemaining > 0 ? (
                        <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isSpeaking
                          ? t.speakingNowBtn
                          : cooldownRemaining > 0
                          ? `${cooldownRemaining}s`
                          : t.speakRoutineBtn}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Template Deletion */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className={`border rounded-3xl w-full max-w-sm p-6 shadow-2xl transition-all ${
            theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-bold text-sm text-rose-500 mb-2">
              {t.confirmDeleteTemplateTitle}
            </h3>
            <p className="text-xs opacity-80 mb-3">
              {t.confirmDeleteTemplateDesc}
            </p>
            <div className="p-3 rounded-xl border bg-slate-900/50 border-slate-700 text-xs font-bold text-cyan-300 mb-4 flex items-center gap-2">
              {renderAppIcon(templateToDelete.icon || 'Search', { className: 'w-4 h-4 shrink-0 text-cyan-400' })}
              <span className="truncate">{templateToDelete.title || templateToDelete.template}</span>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  theme === 'dark' ? 'bg-[#162238] text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30"
              >
                {t.confirmDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Routine Modal with Full Icon Picker */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl transition-all ${
            theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/30 mb-4">
              <h3 className="font-bold text-sm">
                {t.routineModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800/40 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 opacity-80">
                  {t.routineTitleLabel}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Locate Device"
                  className={`w-full border rounded-2xl px-3.5 py-2 text-xs focus:outline-none ${
                    theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">
                  {t.routineTemplateLabel}
                </label>
                <input
                  type="text"
                  required
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  placeholder="Where is device #{num}?"
                  className={`w-full border rounded-2xl px-3.5 py-2 text-xs focus:outline-none ${
                    theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">
                  {t.routineDefaultValueLabel || 'Default Number:'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.default_value}
                  onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                  className={`w-full border rounded-2xl px-3.5 py-2 text-xs font-mono focus:outline-none ${
                    theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white focus:border-[#00D2FF]' : 'bg-slate-50 border-slate-200 focus:border-sky-500'
                  }`}
                />
              </div>

              {/* Full Icon Picker for Everyone */}
              <div>
                <label className="block font-semibold mb-1.5 opacity-80">
                  {t.selectIconLabel}
                </label>
                <IconPicker
                  selectedIcon={formData.icon || 'Search'}
                  onSelectIcon={(icon) => setFormData({ ...formData, icon })}
                  theme={theme}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/30">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-2xl font-bold ${
                    theme === 'dark' ? 'bg-[#162238] text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                >
                  {t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
