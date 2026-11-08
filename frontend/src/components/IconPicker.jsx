import React from 'react';
import {
  Volume2, Bell, Search, Laptop, Cpu, CheckCircle2, Clock,
  AlertTriangle, PhoneCall, Users, Coffee, Utensils, Rocket,
  Sparkles, Flame, Package, Tag, Calendar, Smile, Layers,
  Folder, Activity, Megaphone, HelpCircle
} from 'lucide-react';

export const ICON_MAP = {
  Volume2, Bell, Search, Laptop, Cpu, CheckCircle2, Clock,
  AlertTriangle, PhoneCall, Users, Coffee, Utensils, Rocket,
  Sparkles, Flame, Package, Tag, Calendar, Smile, Layers,
  Folder, Activity, Megaphone, HelpCircle
};

export const AVAILABLE_ICONS = [
  'Volume2', 'Bell', 'Search', 'Laptop', 'Cpu', 'CheckCircle2', 'Clock',
  'AlertTriangle', 'PhoneCall', 'Users', 'Coffee', 'Utensils', 'Rocket',
  'Sparkles', 'Flame', 'Package', 'Tag', 'Calendar', 'Smile', 'Layers',
  'Folder', 'Activity', 'Megaphone'
];

export function renderAppIcon(iconName, props = {}) {
  const Component = ICON_MAP[iconName] || Volume2;
  return <Component {...props} />;
}

export default function IconPicker({ selectedIcon = 'Volume2', onSelectIcon, theme = 'dark' }) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-2 rounded-2xl border max-h-36 overflow-y-auto bg-slate-900/40 border-slate-700/50">
        {AVAILABLE_ICONS.map((name) => {
          const IconComp = ICON_MAP[name];
          const isSelected = selectedIcon === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onSelectIcon && onSelectIcon(name)}
              title={name}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 font-bold scale-110 shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400'
                  : theme === 'dark'
                    ? 'bg-[#121C33] text-slate-300 hover:text-white hover:bg-[#1A284A]'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <IconComp className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

