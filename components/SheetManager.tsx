import React, { useState, useEffect } from 'react';
import { Settings, Save, Cloud, RefreshCw, X, Check, Copy } from 'lucide-react';
import { DtdFile, Language } from '../types';
import { getTranslation } from '../constants/translations';
import { fetchDtdFiles, saveDtdFile, GAS_CODE_SNIPPET } from '../services/sheetService';

interface SheetManagerProps {
  currentDtd: string;
  onLoadDtd: (content: string) => void;
  lang: Language;
}

const SheetManager: React.FC<SheetManagerProps> = ({ currentDtd, onLoadDtd, lang }) => {
  const t = getTranslation(lang);
  const [scriptUrl, setScriptUrl] = useState<string>('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [fileList, setFileList] = useState<DtdFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [copied, setCopied] = useState(false);

  // Load URL from local storage or Environment Variable on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('dtd_validator_sheet_url');
    // Check environment variable (Vite uses import.meta.env)
    // Cast to any to avoid TS error "Property 'env' does not exist on type 'ImportMeta'"
    const envUrl = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL;
    
    // Prioritize localStorage, fallback to env variable
    const urlToUse = savedUrl || envUrl || '';

    if (urlToUse) {
      setScriptUrl(urlToUse);
      loadFiles(urlToUse);
    }
  }, []);

  const loadFiles = async (url: string) => {
    if (!url) return;
    setLoading(true);
    try {
      const files = await fetchDtdFiles(url);
      setFileList(files);
    } catch (e) {
      console.error(e);
      // Optional: show toast error
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    localStorage.setItem('dtd_validator_sheet_url', scriptUrl);
    setIsConfigOpen(false);
    loadFiles(scriptUrl);
  };

  const handleSaveDtd = async () => {
    if (!saveName.trim() || !scriptUrl) return;
    setLoading(true);
    try {
      await saveDtdFile(scriptUrl, { name: saveName, content: currentDtd });
      setIsSaveOpen(false);
      setSaveName('');
      // Refresh list
      await loadFiles(scriptUrl);
    } catch (e) {
      alert("Save failed. Please check your URL and console.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_CODE_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* Status Icon */}
      <div className="hidden sm:flex" title={t.sheetStorage}>
        <Cloud className={`w-4 h-4 ${scriptUrl ? 'text-brand-500' : 'text-slate-600'}`} />
      </div>

      {/* Load Dropdown */}
      <div className="relative">
        <select 
          className="bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded px-2 py-1.5 pr-8 focus:outline-none focus:border-brand-500 w-28 sm:w-40 appearance-none cursor-pointer hover:bg-slate-700 transition-colors"
          onChange={(e) => {
              if (e.target.value) {
                  onLoadDtd(e.target.value);
                  e.target.value = "";
              }
          }}
          disabled={loading || !scriptUrl}
        >
          <option value="">{loading ? t.loading : t.selectFile}</option>
          {fileList.map((f, i) => (
            <option key={i} value={f.content}>{f.name}</option>
          ))}
        </select>
        <div className="absolute right-2 top-1.5 pointer-events-none text-slate-400">
           <span className="text-[10px]">▼</span>
        </div>
      </div>

      {/* Refresh Button */}
      <button 
        onClick={() => loadFiles(scriptUrl)}
        disabled={!scriptUrl || loading}
        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
        title={t.refreshList}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>

      {/* Save Button */}
      <button
        onClick={() => {
            if (!scriptUrl) {
                alert(t.enterUrlFirst);
                setIsConfigOpen(true);
            } else {
                setIsSaveOpen(true);
            }
        }}
        className="p-1.5 text-slate-400 hover:text-brand-400 rounded hover:bg-slate-700 transition-colors"
        title={t.saveToSheet}
      >
        <Save className="w-4 h-4" />
      </button>

      {/* Config Button */}
      <button 
        onClick={() => setIsConfigOpen(true)}
        className={`p-1.5 rounded transition-colors ${!scriptUrl ? 'text-yellow-500 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        title={t.setupSheet}
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Save Modal (Inline Absolute) */}
      {isSaveOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-3 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
           <h4 className="text-slate-200 font-bold text-xs mb-2 flex items-center gap-2">
             <Save className="w-3 h-3 text-brand-500" /> {t.saveToSheet}
           </h4>
           <div className="space-y-2">
             <input 
               autoFocus
               type="text" 
               value={saveName}
               onChange={(e) => setSaveName(e.target.value)}
               placeholder={t.enterFileName}
               className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
             />
             <div className="flex gap-2 justify-end">
               <button onClick={() => setIsSaveOpen(false)} className="px-2 py-1 text-xs text-slate-400 hover:text-white">{t.cancel}</button>
               <button 
                 onClick={handleSaveDtd} 
                 disabled={loading || !saveName.trim()}
                 className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded"
               >
                 {loading ? t.saving : t.save}
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Config Modal (Overlay) */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 sticky top-0 bg-slate-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-500" />
                {t.setupSheet}
              </h3>
              <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* URL Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">{t.scriptUrl}</label>
                <input 
                  type="text" 
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  placeholder={t.urlPlaceholder}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm text-brand-300 font-mono focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Instructions */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <h4 className="text-sm font-bold text-brand-400 mb-3">{t.howToSetup}</h4>
                <ol className="text-xs text-slate-400 space-y-2 mb-4 leading-relaxed">
                  <li>{t.setupStep1}</li>
                  <li>{t.setupStep2}</li>
                  <li>{t.setupStep3}</li>
                  <li>{t.setupStep4}</li>
                  <li>{t.setupStep5}</li>
                </ol>
                
                <div className="relative group">
                  <pre className="bg-slate-950 p-3 rounded border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto">
                    {GAS_CODE_SNIPPET}
                  </pre>
                  <button 
                    onClick={handleCopyCode}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-white flex items-center gap-1 shadow-sm"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {copied ? t.codeCopied : t.copyCode}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 sticky bottom-0 flex justify-end gap-3">
              <button onClick={() => setIsConfigOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">{t.cancel}</button>
              <button onClick={handleSaveConfig} className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded text-sm shadow-lg shadow-brand-900/20">
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SheetManager;