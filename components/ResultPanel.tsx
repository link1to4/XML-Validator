import React from 'react';
import { ValidationResult } from '../types';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ResultPanelProps {
  result: ValidationResult | null;
  loading: boolean;
  error: string | null;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ result, loading, error }) => {
  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-sm">Analyzing structure...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
        <div>
          <h3 className="text-red-400 font-bold text-lg mb-2">System Error</h3>
          <p className="text-red-200/80">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
        <p className="text-lg">Ready to validate</p>
        <p className="text-sm mt-2">Enter DTD and XML above and press Start</p>
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
            {result.isValid ? 'Validation Successful' : 'Validation Failed'}
          </h2>
          <p className="text-sm text-slate-400">{result.generalComment}</p>
        </div>
      </div>
      
      {!result.isValid && result.errors.length > 0 && (
        <div className="p-6 bg-slate-900/50">
          <h3 className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-3">
            Detailed Errors
          </h3>
          <ul className="space-y-3">
            {result.errors.map((err, idx) => (
              <li key={idx} className="flex gap-3 text-red-300/90 font-mono text-sm bg-red-950/30 p-3 rounded border border-red-900/30 whitespace-pre-wrap">
                <span className="text-red-500 select-none mt-0.5">•</span>
                <span>{err}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {result.isValid && (
         <div className="p-6 bg-slate-900/50">
           <p className="text-green-300/80 text-center font-mono text-sm">
             The XML document strictly conforms to the provided DTD definition.
           </p>
         </div>
      )}
    </div>
  );
};

export default ResultPanel;