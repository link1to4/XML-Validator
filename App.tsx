import React, { useState, useRef } from 'react';
import { Play, Trash2, Languages } from 'lucide-react';
import Editor, { EditorHandle } from './components/Editor';
import ResultPanel from './components/ResultPanel';
import HistoryPanel from './components/HistoryPanel';
import SheetManager from './components/SheetManager';
import { validateXmlWithDtd } from './services/geminiService';
import { ValidationResult, HistoryItem, Language } from './types';
import { getTranslation } from './constants/translations';

// Helper for generating IDs in environments where crypto.randomUUID might be unavailable 
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const App: React.FC = () => {
  const [dtdInput, setDtdInput] = useState<string>('');
  const [xmlInput, setXmlInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lang, setLang] = useState<Language>('en');

  const t = getTranslation(lang);

  // Refs to access Editors' methods
  const xmlEditorRef = useRef<EditorHandle>(null);
  const dtdEditorRef = useRef<EditorHandle>(null);

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
  };

  const handleValidate = async () => {
    if (!dtdInput.trim() || !xmlInput.trim()) {
      setError(t.errorInput);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const validationResult = await validateXmlWithDtd(dtdInput, xmlInput);
      setResult(validationResult);
      
      // Add to history
      const historyItem: HistoryItem = {
        id: generateId(),
        dtd: dtdInput,
        xml: xmlInput,
        result: validationResult
      };

      setHistory(prev => {
        const newHistory = [historyItem, ...prev];
        return newHistory.slice(0, 10); // Keep only top 10
      });

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setDtdInput('');
    setXmlInput('');
    setResult(null);
    setError(null);
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    setDtdInput(item.dtd);
    setXmlInput(item.xml);
    setResult(item.result);
    setError(null);
  };

  const handleJumpToLocation = (location: 'xml' | 'dtd', line: number) => {
    if (location === 'xml' && xmlEditorRef.current) {
      xmlEditorRef.current.scrollToLine(line);
    } else if (location === 'dtd' && dtdEditorRef.current) {
      dtdEditorRef.current.scrollToLine(line);
    }
  };

  // Sample data for quick testing
  const loadSample = () => {
    // Normalize newlines to \n for consistency
    const dtd = `<!ELEMENT note (to,from,heading,body)>
<!ELEMENT to (#PCDATA)>
<!ELEMENT from (#PCDATA)>
<!ELEMENT heading (#PCDATA)>
<!ELEMENT body (#PCDATA)>`.replace(/\r\n/g, '\n').trim();

    const xml = `<note>
<to>Tove</to>
<from>Jani</from>
<heading>Reminder</heading>
<body>Don't forget me this weekend!</body>
</note>`.replace(/\r\n/g, '\n').trim();

    setDtdInput(dtd);
    setXmlInput(xml);
    setResult(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 shadow-sm z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center text-white font-bold">
              XML
            </div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              {t.appTitle} <span className="text-brand-500 text-sm font-normal ml-1 border border-brand-500/30 bg-brand-500/10 px-1.5 py-0.5 rounded">{t.localMode}</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={loadSample}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {t.loadSample}
            </button>
            <div className="h-4 w-px bg-slate-700"></div>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-medium border border-slate-700"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? '繁體中文' : 'English'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col p-4 gap-4 max-w-7xl mx-auto w-full">
        
        {/* Editors Section - Top Half */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
          <Editor 
            ref={dtdEditorRef}
            label={t.dtdLabel} 
            value={dtdInput} 
            onChange={setDtdInput} 
            placeholder={t.dtdPlaceholder}
            languageLabel="DTD"
            dropLabel={t.dropFile}
            headerActions={
              <SheetManager 
                currentDtd={dtdInput}
                onLoadDtd={(content) => setDtdInput(content.replace(/\r\n/g, '\n'))}
                lang={lang}
              />
            }
          />
          <Editor 
            ref={xmlEditorRef}
            label={t.xmlLabel}
            value={xmlInput} 
            onChange={setXmlInput} 
            placeholder={t.xmlPlaceholder}
            languageLabel="XML"
            dropLabel={t.dropFile}
          />
        </div>

        {/* Controls */}
        <div className="shrink-0 flex justify-center py-2 gap-4 relative">
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <button
            onClick={handleValidate}
            disabled={loading || (!dtdInput && !xmlInput)}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-full font-bold shadow-lg shadow-brand-900/20 transform transition-all active:scale-95 z-10
              ${loading || (!dtdInput && !xmlInput)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-brand-600 hover:bg-brand-500 text-white hover:shadow-brand-500/20'}
            `}
          >
            {loading ? (
              <span>{t.validating}</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{t.startValidation}</span>
              </>
            )}
          </button>
          
          <button
             onClick={handleClear}
             className="flex items-center gap-2 px-4 py-3 rounded-full bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors z-10"
             title={t.clearAll}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Results & History Section - Bottom Area */}
        <div className="shrink-0 h-[35%] min-h-[200px] grid grid-cols-1 lg:grid-cols-4 gap-4">
           {/* Current Result */}
           <div className="lg:col-span-3 h-full overflow-y-auto custom-scrollbar">
              <ResultPanel 
                result={result} 
                loading={loading} 
                error={error} 
                onJump={handleJumpToLocation}
                lang={lang}
              />
           </div>
           
           {/* History Panel */}
           <div className="lg:col-span-1 h-full overflow-hidden">
              <HistoryPanel history={history} onRestore={handleRestoreHistory} lang={lang} />
           </div>
        </div>

      </main>
    </div>
  );
};

export default App;