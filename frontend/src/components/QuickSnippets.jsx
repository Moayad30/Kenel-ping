import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Check, Tag } from 'lucide-react';
import { useThemeLang } from '../context/ThemeLanguageContext';

export default function QuickSnippets({ onSelectSnippet }) {
  const { theme, t } = useThemeLang();

  const [snippets, setSnippets] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');

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

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(t.deleteSnippetConfirm || 'Delete snippet?')) return;
    try {
      const res = await fetch(`/api/snippets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSnippets((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Error deleting snippet:', err);
    }
  };

  return (
    <div className="space-y-2 mb-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          {t.snippetsTitle}
        </span>

        {!isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-[11px] font-bold px-2 py-0.5 rounded-lg border text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 flex items-center gap-1 transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>{t.addSnippetBtn}</span>
          </button>
        ) : (
          <form onSubmit={handleAdd} className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder={t.snippetPlaceholder}
              className={`text-xs px-2.5 py-1 rounded-lg border focus:outline-none ${
                theme === 'dark' ? 'bg-[#070C1B] border-cyan-500/50 text-white' : 'bg-white border-sky-400 text-slate-800'
              }`}
            />
            <button
              type="submit"
              className="p-1 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              title={t.saveSnippetBtn}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setNewText(''); }}
              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* Horizontal scrollable chips */}
      <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto p-1">
        {snippets.map((snip) => (
          <div
            key={snip.id}
            onClick={() => onSelectSnippet(snip.text)}
            className={`group flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer border transition-all hover:scale-105 active:scale-95 ${
              theme === 'dark'
                ? 'bg-[#121C33] border-[#1F3152] text-slate-200 hover:border-cyan-400 hover:text-cyan-300'
                : 'bg-slate-100 border-slate-200 text-slate-800 hover:border-sky-400 hover:text-sky-700'
            }`}
          >
            <span>{snip.text}</span>
            <button
              type="button"
              onClick={(e) => handleDelete(snip.id, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-rose-400 hover:bg-rose-500/20 transition-opacity"
              title={t.deleteSnippetBtn}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

