import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Upload } from 'lucide-react';

export interface EditorHandle {
  scrollToLine: (line: number) => void;
}

interface EditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  languageLabel?: string;
  dropLabel?: string;
  headerActions?: React.ReactNode;
}

const normalizeText = (text: string): string => {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

const Editor = forwardRef<EditorHandle, EditorProps>(({ label, value, onChange, placeholder, languageLabel, dropLabel = "Drop file here to load", headerActions }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useImperativeHandle(ref, () => ({
    scrollToLine: (lineNumber: number) => {
      if (!textareaRef.current) return;

      // Ensure we are calculating based on the normalized view
      const normalizedValue = normalizeText(value);
      const lines = normalizedValue.split('\n');
      
      // Line numbers are 1-based, array is 0-based
      const targetIndex = lineNumber - 1;

      if (targetIndex < 0 || targetIndex >= lines.length) return;

      // Calculate character position up to that line
      let charCount = 0;
      for (let i = 0; i < targetIndex; i++) {
        // Add length of line plus 1 for the newline character
        charCount += lines[i].length + 1; 
      }

      // Set cursor position to the start of that line
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charCount, charCount);
      textareaRef.current.blur(); 
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
  }));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          // Normalize line endings immediately upon load
          onChange(normalizeText(event.target.result as string));
        }
      };
      
      reader.readAsText(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     // Browsers usually normalize textarea value to \n, but we ensure it
     onChange(e.target.value);
  };

  return (
    <div 
      className={`flex flex-col h-full bg-slate-800 rounded-lg border shadow-xl transition-all duration-200 relative ${isDragging ? 'border-brand-500 ring-2 ring-brand-500/20 scale-[1.02]' : 'border-slate-700'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="bg-slate-900/50 px-3 py-2 border-b border-slate-700 flex justify-between items-center relative z-20 rounded-t-lg min-h-[48px]">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap">
            {label}
          </label>
          {languageLabel && (
            <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded hidden sm:inline-block">
              {languageLabel}
            </span>
          )}
        </div>
        
        {headerActions && (
          <div className="flex items-center">
            {headerActions}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative rounded-b-lg overflow-hidden group">
        <textarea
          ref={textareaRef}
          className="w-full h-full bg-slate-800 text-slate-300 p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-slate-800/80 transition-all custom-scrollbar relative z-0"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          spellCheck={false}
        />
        
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-in fade-in duration-200 pointer-events-none rounded-b-lg">
            <Upload className="w-12 h-12 text-brand-500 mb-2 animate-bounce" />
            <p className="text-brand-100 font-bold text-lg">{dropLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;