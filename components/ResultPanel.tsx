import React from 'react';
import { ValidationResult, Language } from '../types';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getTranslation } from '../constants/translations';

interface ResultPanelProps {
  result: ValidationResult | null;
  loading: boolean;
  error: string | null;
  onJump?: (type: 'xml' | 'dtd', line: number) => void;
  lang: Language;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ result, loading, error, onJump, lang }) => {
  const t = getTranslation(lang);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-sm">{t.analyzing}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
        <div>
          <h3 className="text-red-400 font-bold text-lg mb-2">{t.systemError}</h3>
          <p className="text-red-200/80">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
        <p className="text-lg">{t.ready}</p>
        <p className="text-sm mt-2">{t.readyDesc}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border shadow-lg overflow-hidden transition-all duration-500 ${result.isValid ? 'bg-green-900/10 border-green-800/50' : 'bg-red-900/10 border-red-800/50'}`}>
      <div className={`p-4 border-b flex items-center gap-3 ${result.isValid ? 'bg-green-900/20 border-green-800/50' : 'bg-red-900/20 border-red-800/50'}`}>
        {result.isValid ? (
          <CheckCircle className="w-8 h-8 text-green-500" />
        ) : (
          <XCircle className="w-8 h-8 text-red-500" />
        )}
        <div>
          <h2 className={`text-xl font-bold ${result.isValid ? 'text-green-400' : 'text-red-400'}`}>
            {result.isValid ? t.validationSuccess : t.validationFailed}
          </h2>
          <p className="text-sm text-slate-400">
            {/* If there's a specific English message, we might prefer showing the static translated success message for better UX in ZH mode */}
            {result.isValid ? t.successMsg : result.generalComment}
          </p>
        </div>
      </div>
      
      {!result.isValid && result.errors.length > 0 && (
        <div className="p-6 bg-slate-900/50">
          <h3 className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-3">
            {t.detailedErrors}
          </h3>
          <ul className="space-y-3">
            {result.errors.map((err, idx) => {
              // Extract all tag occurrences like [XML: 12] or [DTD: 5]
              const tagRegex = /\[(XML|DTD):\s*(\d+)\]/g;
              const tags = [];
              let match;
              while ((match = tagRegex.exec(err)) !== null) {
                tags.push({ type: match[1].toLowerCase() as 'xml' | 'dtd', line: parseInt(match[2], 10), label: match[0] });
              }
              
              // Remove tags from the message to get clean text
              const cleanMessage = err.replace(tagRegex, '').trim();

              return (
                <li key={idx} className="flex gap-3 text-red-300/90 font-mono text-sm bg-red-950/30 p-3 rounded border border-red-900/30 whitespace-pre-wrap">
                  <span className="text-red-500 select-none mt-0.5">•</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-1">
                      {tags.map((tag, tIdx) => (
                         <button 
                            key={tIdx}
                            onClick={() => onJump && onJump(tag.type, tag.line)}
                            className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold border transition-all cursor-pointer hover:text-white hover:underline
                              ${tag.type === 'xml' 
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/40' 
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/40'
                              }`}
                            title={`${t.jumpTo} ${tag.type.toUpperCase()} Line ${tag.line}`}
                          >
                            {tag.label}
                          </button>
                      ))}
                    </div>
                    <span>{cleanMessage}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {result.isValid && (
         <div className="p-6 bg-slate-900/50">
           <p className="text-green-300/80 text-center font-mono text-sm">
             {t.successMsg}
           </p>
         </div>
      )}
    </div>
  );
};

export default ResultPanel;