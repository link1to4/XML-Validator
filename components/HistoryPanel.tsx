import React from 'react';
import { HistoryItem } from '../types';
import { CheckCircle, XCircle, Clock, RotateCcw, History } from 'lucide-react';

interface HistoryPanelProps {
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onRestore }) => {
  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-xl">
      <div className="bg-slate-900/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center shrink-0">
        <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-brand-500" />
          History (Last 10)
        </label>
        <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded">
          {history.length} / 10
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60 min-h-[100px]">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No history yet</p>
          </div>
        ) : (
          history.map((item) => (
            <button
              key={item.id}
              onClick={() => onRestore(item)}
              className="w-full text-left group flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700 hover:border-slate-600 transition-all hover:shadow-md"
            >
              <div className="mt-0.5 shrink-0">
                {item.result.isValid ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold ${item.result.isValid ? 'text-green-400' : 'text-red-400'}`}>
                    {item.result.isValid ? 'Passed' : 'Failed'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate leading-relaxed">
                  {item.result.isValid 
                    ? "Strict compliance confirmed" 
                    : `${item.result.errors.length} error${item.result.errors.length === 1 ? '' : 's'} found`}
                </p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center p-1 rounded-full bg-slate-600/50">
                 <RotateCcw className="w-3 h-3 text-brand-300" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;