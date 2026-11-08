import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Check, Tag } from 'lucide-react';
import { useThemeLang } from '../context/ThemeLanguageContext';

export default function QuickSnippets({ onSelectSnippet, isSpeaking = false }) {
  const { theme, t } = useThemeLang();

  const [snippets, setSnippets] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [snippetToDelete, setSnippetToDelete] = useState(null);

  useEffect(() => {
    fetchSnippets();
  }, []);

  const fetchSnippets = async () => {
    try {
      const res = await fetch('/api/snippets');
      if (res.ok) {
        const data = await res.json();
        setSnippets(data);
      }
    } catch (err) {
      console.error('Error fetching snippets:', err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;

    try {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `snip_${Date.now()}`,
          text: newText.trim(),
          order: snippets.length + 1
        })
      });
      if (res.ok) {
        const created = await res.json();
        setSnippets((prev) => [...prev, created.snippet]);
        setNewText('');
        setIsAdding(false);
      }
    } catch (err) {
      console.error('Error adding snippet:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!snippetToDelete) return;
    try {
      const res = await fetch(`/api/snippets/${snippetToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSnippets((prev) => prev.filter((s) => s.id !== snippetToDelete.id));
      }
    } catch (err) {
      console.error('Error deleting snippet:', err);
    } finally {
      setSnippetToDelete(null);
    }
  };

  return (
    <div className="space-y-2 mb-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          {t.snippetsTitle}
        </span>

        {!isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-xl border text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addSnippetBtn}</span>
          </button>
        ) : (
          <form onSubmit={handleAdd} className="flex items-center gap-1.5 w-full sm:w-auto">
            <input
              type="text"
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder={t.snippetPlaceholder}
              className={`text-xs px-2.5 py-1 rounded-xl border focus:outline-none min-w-[150px] ${
                theme === 'dark' ? 'bg-[#070C1B] border-cyan-500/50 text-white' : 'bg-white border-sky-400 text-slate-800'
              }`}
            />

            <button
              type="submit"
              className="p-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-all shadow-sm"
              title={t.saveSnippetBtn}
            >
              <Check className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => { setIsAdding(false); setNewText(''); }}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* Pure text chips without icons as requested */}
      <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto p-1">
        {snippets.map((snip) => (
          <div
            key={snip.id}
            onClick={() => onSelectSnippet(snip.text)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-all hover:scale-105 active:scale-95 ${
              theme === 'dark'
                ? 'bg-[#121C33] border-[#1F3152] text-slate-200 hover:border-cyan-400 hover:text-cyan-300'
                : 'bg-slate-100 border-slate-200 text-slate-800 hover:border-sky-400 hover:text-sky-700'
            }`}
          >
            <span>{snip.text}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSnippetToDelete(snip);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-rose-400 hover:bg-rose-500/20 transition-opacity"
              title={t.deleteSnippetBtn}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal for Snippet Deletion */}
      {snippetToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className={`border rounded-3xl w-full max-w-sm p-6 shadow-2xl transition-all ${
            theme === 'dark' ? 'bg-[#0B132B] border-[#1F3152]' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-bold text-sm text-rose-500 mb-2">
              {t.confirmDeleteSnippetTitle}
            </h3>
            <p className="text-xs opacity-80 mb-3">
              {t.confirmDeleteSnippetDesc}
            </p>
            <div className="p-3 rounded-xl border bg-slate-900/50 border-slate-700 text-xs font-bold text-cyan-300 mb-4">
              "{snippetToDelete.text}"
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSnippetToDelete(null)}
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
    </div>
  );
}
