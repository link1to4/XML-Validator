import React from 'react';

interface EditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  languageLabel?: string;
}

const Editor: React.FC<EditorProps> = ({ label, value, onChange, placeholder, languageLabel }) => {
  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-xl">
      <div className="bg-slate-900/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
        <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
        {languageLabel && (
          <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded">
            {languageLabel}
          </span>
        )}
      </div>
      <div className="flex-1 relative">
        <textarea
          className="w-full h-full bg-slate-800 text-slate-300 p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-slate-800/80 transition-all custom-scrollbar"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export default Editor;