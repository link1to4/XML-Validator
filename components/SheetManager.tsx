import React, { useState, useEffect } from 'react';
import { Save, Cloud, RefreshCw, Trash2 } from 'lucide-react';
import { DtdFile, Language } from '../types';
import { getTranslation } from '../constants/translations';
import { fetchDtdFiles, saveDtdFile, deleteDtdFile } from '../services/firestoreService';

interface SheetManagerProps {
  currentDtd: string;
  onLoadDtd: (content: string) => void;
  lang: Language;
}

const SheetManager: React.FC<SheetManagerProps> = ({ currentDtd, onLoadDtd, lang }) => {
  const t = getTranslation(lang);
  const [fileList, setFileList] = useState<DtdFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [selectedFile, setSelectedFile] = useState<string>('');

  // 初始載入檔案列表
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const files = await fetchDtdFiles();
      setFileList(files);
    } catch (e) {
      console.error('Failed to load files:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDtd = async () => {
    if (!saveName.trim()) return;
    setLoading(true);
    try {
      await saveDtdFile({ name: saveName.trim(), content: currentDtd });
      setIsSaveOpen(false);
      setSaveName('');
      await loadFiles();
    } catch (e) {
      alert(t.saveFailed || 'Save failed. Please check console.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (name: string) => {
    if (!confirm(`${t.confirmDelete || 'Delete'} "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteDtdFile(name);
      await loadFiles();
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = (value: string) => {
    if (value) {
      const file = fileList.find(f => f.name === value);
      if (file) {
        onLoadDtd(file.content.replace(/\r\n/g, '\n'));
        setSelectedFile('');
      }
    }
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* Status Icon */}
      <div className="hidden sm:flex" title={t.cloudStorage}>
        <Cloud className="w-4 h-4 text-brand-500" />
      </div>

      {/* Load Dropdown */}
      <div className="relative">
        <select
          className="bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded px-2 py-1.5 pr-8 focus:outline-none focus:border-brand-500 w-32 sm:w-44 appearance-none cursor-pointer hover:bg-slate-700 transition-colors"
          value={selectedFile}
          onChange={(e) => handleSelectFile(e.target.value)}
          disabled={loading}
        >
          <option value="">{loading ? t.loading : t.selectFile}</option>
          {fileList.map((f, i) => (
            <option key={i} value={f.name}>{f.name}</option>
          ))}
        </select>
        <div className="absolute right-2 top-1.5 pointer-events-none text-slate-400">
          <span className="text-[10px]">▼</span>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadFiles}
        disabled={loading}
        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
        title={t.refreshList}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>

      {/* Save Button */}
      <button
        onClick={() => setIsSaveOpen(true)}
        className="p-1.5 text-slate-400 hover:text-brand-400 rounded hover:bg-slate-700 transition-colors"
        title={t.saveToCloud}
      >
        <Save className="w-4 h-4" />
      </button>

      {/* Save Modal */}
      {isSaveOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-3 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
          <h4 className="text-slate-200 font-bold text-xs mb-2 flex items-center gap-2">
            <Save className="w-3 h-3 text-brand-500" /> {t.saveToCloud}
          </h4>
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t.enterFileName}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveDtd()}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsSaveOpen(false)} className="px-2 py-1 text-xs text-slate-400 hover:text-white">{t.cancel}</button>
              <button
                onClick={handleSaveDtd}
                disabled={loading || !saveName.trim()}
                className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded disabled:opacity-50"
              >
                {loading ? t.saving : t.save}
              </button>
            </div>
          </div>

          {/* 已儲存的檔案列表（可刪除） */}
          {fileList.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <h5 className="text-slate-400 text-[10px] uppercase mb-2">{t.savedFiles}</h5>
              <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                {fileList.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-slate-300 hover:bg-slate-700 px-2 py-1 rounded group">
                    <span className="truncate flex-1" title={f.name}>{f.name}</span>
                    <button
                      onClick={() => handleDeleteFile(f.name)}
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title={t.delete}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SheetManager;