import React, { useState, useEffect } from 'react';
import {
  Cpu, CheckCircle2, Clock, Search, Laptop, AlertCircle, Plus,
  Trash2, Edit2, Play, Volume2, X, RefreshCw, Layers
} from 'lucide-react';
import { useThemeLang } from '../context/ThemeLanguageContext';

const ICON_MAP = {
  Cpu, CheckCircle2, Clock, Search, Laptop, AlertCircle, Layers
};

export default function RoutineActions({ onRoutineSpoke, cooldownRemaining = 0 }) {
  const { theme, t } = useThemeLang();

  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
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
    if (cooldownRemaining > 0 || submittingId) return;
    setSubmittingId(routine.id);

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
      template: 'Completed {num} devices so far.',
      default_value: '10',
      icon: 'CheckCircle2',
      color: 'emerald'
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

  const handleDelete = async (routineId) => {
    if (!window.confirm(t.deleteSnippetConfirm || 'Delete this routine template?')) return;
    try {
      const res = await fetch(`/api/routines/${routineId}`, { method: 'DELETE' });
      if (res.ok) {
        setRoutines((prev) => prev.filter((r) => r.id !== routineId));
      }
    } catch (err) {
      console.error('Error deleting routine:', err);
    }
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formData.template.trim()) return;

    if (editingRoutine) {
      // Update
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
      // Create
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

  return (
    <section className={`border rounded-3xl p-6 sm:p-7 shadow-xl mb-8 transition-all ${
      theme === 'dark' ? 'bg-[#0B132B]/80 border-[#1F3152]' : 'bg-white border-slate-200 shadow-slate-100'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/30 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
            theme === 'dark' ? 'bg-[#00D2FF]/10 border-[#00D2FF]/30 text-[#00D2FF]' : 'bg-sky-50 border-sky-200 text-sky-600'
          }`}>
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {t.routinesTitle}
            </h2>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {t.routinesSubtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-md shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addRoutineBtn}</span>
        </button>
      </div>

      {/* Routine Cards Grid */}
      {loading ? (
        <div className="py-8 text-center text-xs opacity-60 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Loading routine templates...</span>
        </div>
      ) : routines.length === 0 ? (
        <div className="py-8 text-center text-xs opacity-60">
          No routine templates configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routines.map((routine) => {
            const IconComp = ICON_MAP[routine.icon] || Cpu;
            const currentVal = values[routine.id] !== undefined ? values[routine.id] : routine.default_value || '1';
            const previewText = routine.template.replace('{num}', currentVal).replace('{x}', currentVal);

            return (
              <div
                key={routine.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  theme === 'dark'
                    ? 'bg-[#070C1B]/80 border-[#1F3152] hover:border-[#00D2FF]/40'
                    : 'bg-slate-50 border-slate-200 hover:border-sky-300'
                }`}
              >
                {/* Top Row: Icon + Title + Edit/Delete */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      {routine.title || previewText}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(routine)}
                      title={t.editRoutineBtn}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(routine.id)}
                      title={t.deleteRoutineBtn}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Live Speech Preview Bubble */}
                <div className={`p-2.5 rounded-xl border text-xs font-semibold leading-relaxed ${
                  theme === 'dark' ? 'bg-[#0E1B38]/60 border-[#1F3152] text-cyan-300' : 'bg-white border-slate-200 text-sky-800'
                }`}>
                  <span className="opacity-60 text-[10px] block mb-0.5 font-normal">{t.liveSpeechPreview}</span>
                  "{previewText}"
                </div>

                {/* Bottom Row: Number Stepper + Broadcast Button */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {/* Stepper Controls */}
                  <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => handleStep(routine.id, -1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center transition-all"
                    >
                      -
                    </button>
                    <input
                      type="text"
                      value={currentVal}
                      onChange={(e) => handleValueChange(routine.id, e.target.value)}
                      className="w-14 text-center font-mono font-bold text-xs bg-transparent text-cyan-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleStep(routine.id, 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center justify-center transition-all"
                    >
                      +
                    </button>
                  </div>

                  {/* Broadcast Button */}
                  <button
                    type="button"
                    onClick={() => handleSpeak(routine)}
                    disabled={submittingId === routine.id || cooldownRemaining > 0}
                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                  >
                    {submittingId === routine.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>{t.speakRoutineBtn}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Routine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
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

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 opacity-80">
                  {t.routineTitleLabel}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t.routineTitlePlaceholder}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                    theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">
                  {t.routineTemplateLabel}
                </label>
                <textarea
                  rows={3}
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  placeholder="Where is device #{num}?"
                  required
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                    theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
                <span className="text-[10px] opacity-60 block mt-1">
                  {t.routineHelpNum}
                </span>
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">
                  {t.routineDefaultValueLabel}
                </label>
                <input
                  type="text"
                  value={formData.default_value}
                  onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none font-mono ${
                    theme === 'dark' ? 'bg-[#070C1B] border-[#1F3152] text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700/30">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                >
                  {t.saveRoutineBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
