import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileImage,
  FileText,
  Fingerprint,
  History,
  ImagePlus,
  Info,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT = 12000;
const SAMPLE_MESSAGE = 'SECURITY ALERT: Your bank account will be suspended in 30 minutes. Verify your identity immediately to avoid permanent deactivation: http://secure-bank-verify.example.com';

function getRiskMeta(score = 0) {
  if (score >= 70) return { label: 'High risk', className: 'high', short: 'HIGH RISK' };
  if (score >= 40) return { label: 'Needs review', className: 'medium', short: 'REVIEW' };
  return { label: 'Lower risk', className: 'low', short: 'LOW RISK' };
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return 'Recently';
  }
}

function App() {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking');
  const [apiMode, setApiMode] = useState('demo');
  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!active) return;
        setApiStatus(response.ok ? 'online' : 'offline');
        setApiMode(data.mode || 'demo');
      })
      .catch(() => { if (active) setApiStatus('offline'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('traces-history') || '[]');
      if (Array.isArray(saved)) setHistory(saved.slice(0, 5));
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (!file) {
      setFilePreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const readyToAnalyze = useMemo(() => Boolean(message.trim() || file) && !loading, [message, file, loading]);

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function acceptFile(candidate) {
    setError('');
    if (!candidate) return;
    if (!candidate.type.startsWith('image/')) {
      setError('Please choose an image file such as PNG, JPG, or WEBP.');
      return;
    }
    if (candidate.size > MAX_FILE_BYTES) {
      setError('That image is larger than 8 MB. Please choose a smaller screenshot.');
      return;
    }
    setFile(candidate);
  }

  function resetWorkspace() {
    setMessage('');
    setResult(null);
    setError('');
    clearFile();
  }

  async function runAnalysis(event) {
    event?.preventDefault();
    if (!readyToAnalyze) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body = new FormData();
      body.append('message', message.trim());
      if (file) body.append('image', file);

      const response = await fetch('/api/analyze', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Analysis could not be completed. Please try again.');

      setResult(data);
      const score = Number(data.analysis?.fraudProbability ?? 0);
      const item = {
        id: `${Date.now()}`,
        time: new Date().toISOString(),
        preview: (message.trim() || data.extractedText || file?.name || 'Image scan').replace(/\s+/g, ' ').slice(0, 76),
        score,
        mode: data.mode || 'demo',
      };
      setHistory((current) => {
        const next = [item, ...current].slice(0, 5);
        try { localStorage.setItem('traces-history', JSON.stringify(next)); } catch { /* Private browsing can block storage. */ }
        return next;
      });
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong while analyzing this message.');
    } finally {
      setLoading(false);
    }
  }

  function loadText(text) {
    setMessage(text);
    clearFile();
    setResult(null);
    setError('');
    textAreaRef.current?.focus();
  }

  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem('traces-history'); } catch { /* Ignore storage restrictions. */ }
  }

  const statusLabel = apiStatus === 'checking' ? 'Checking API' : apiStatus === 'offline' ? 'API offline' : apiMode === 'ai' ? 'Gemini ready' : 'Demo mode';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Fingerprint size={20} strokeWidth={1.8} /></span>
          <span className="brand-name">TRACES<span className="brand-period">.</span></span>
        </div>
        <div className={`status-pill ${apiStatus}`}><span className="status-dot" />{statusLabel}</div>
      </header>

      <main className="page">
        <section className="intro">
          <div>
            <h1>Is this message <span>a scam?</span></h1>
            <p>Paste a message or upload a screenshot to get an estimated fraud-risk score.</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => loadText(SAMPLE_MESSAGE)}><Sparkles size={15} /> Try a sample</button>
        </section>

        <div className="grid">
          <section className="panel" aria-labelledby="scan-title">
            <h2 id="scan-title" className="panel-title">Message</h2>
            <form onSubmit={runAnalysis}>
              <label className="field-label" htmlFor="message-input">Text <span>optional if you attach an image</span></label>
              <div className="textarea-wrap">
                <textarea
                  id="message-input"
                  ref={textAreaRef}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Paste the suspicious SMS, email, or payment request here..."
                  maxLength={MAX_TEXT}
                  spellCheck="false"
                />
                <div className="textarea-footer">{message.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}</div>
              </div>

              <div className="field-label upload-label">Screenshot <span>PNG, JPG, WEBP · max 8 MB</span></div>
              {!file ? (
                <button
                  type="button"
                  className={`dropzone ${isDragging ? 'dragging' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => { event.preventDefault(); setIsDragging(false); acceptFile(event.dataTransfer.files?.[0]); }}
                >
                  <span className="upload-symbol"><ImagePlus size={19} /></span>
                  <span className="dropzone-copy"><strong>Drop a screenshot here, or <em>browse</em></strong><small>Text is extracted automatically with OCR.</small></span>
                  <Upload size={17} className="upload-arrow" />
                </button>
              ) : (
                <div className="attached-file">
                  {filePreview ? <img src={filePreview} alt="Selected screenshot preview" /> : <FileImage size={22} />}
                  <div className="attached-copy"><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></div>
                  <span className="file-ready"><Check size={13} /> Ready</span>
                  <button type="button" className="remove-file" onClick={clearFile} aria-label="Remove selected image"><X size={16} /></button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/bmp,image/tiff" className="visually-hidden" onChange={(event) => acceptFile(event.target.files?.[0])} />

              {error && <div className="error-banner" role="alert"><CircleAlert size={16} /><span>{error}</span></div>}

              <div className="form-actions">
                <button type="button" className="clear-button" onClick={resetWorkspace} disabled={loading}>Clear</button>
                <button type="submit" className="primary-button" disabled={!readyToAnalyze}>
                  {loading ? <><span className="button-spinner" /> Analyzing...</> : <>Analyze message <ArrowUpRight size={16} /></>}
                </button>
              </div>
              <div className="safe-note"><ShieldCheck size={14} /><span>This is an estimate, not a guarantee. Always verify through official channels.</span></div>
            </form>
          </section>

          <section className="panel results-panel" aria-live="polite" aria-labelledby="results-title">
            <div className="panel-head">
              <h2 id="results-title" className="panel-title">Analysis</h2>
              {result && <span className={`result-mode ${result.mode === 'ai' ? 'real-ai' : 'demo'}`}>{result.mode === 'ai' ? 'Gemini' : 'Demo'}</span>}
            </div>

            {!result && !loading && (
              <div className="empty-results">
                <span className="empty-icon"><ShieldCheck size={30} strokeWidth={1.4} /></span>
                <h3>Waiting for a message</h3>
                <p>Run a scan to see the risk score, warning signs, and recommended next steps.</p>
              </div>
            )}

            {loading && (
              <div className="empty-results">
                <span className="empty-icon spinning"><ScanLine size={30} strokeWidth={1.4} /></span>
                <h3>Inspecting message</h3>
                <p>Extracting text and checking for fraud indicators.</p>
              </div>
            )}

            {result && <AnalysisReport result={result} />}
          </section>
        </div>

        <section className="history">
          <div className="history-head">
            <h2>Recent scans</h2>
            {history.length > 0 && <button type="button" className="text-button" onClick={clearHistory}>Clear history</button>}
          </div>
          {history.length === 0 ? (
            <div className="history-empty"><History size={18} /><p>No scans yet. Your latest analyses will show up here.</p></div>
          ) : (
            <div className="history-list">
              {history.map((item) => {
                const meta = getRiskMeta(item.score);
                return (
                  <button type="button" className="history-row" key={item.id} onClick={() => loadText(item.preview)}>
                    <span className="history-doc"><FileText size={16} /></span>
                    <span className="history-main"><strong>{item.preview || 'Message scan'}</strong><small>{formatTime(item.time)} · {item.mode === 'ai' ? 'Gemini' : 'Demo'}</small></span>
                    <span className={`history-score ${meta.className}`}>{item.score}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <footer className="footer">TRACES — fraud-message analysis. Estimates only; not proof of fraud or legitimacy.</footer>
      </main>
    </div>
  );
}

function AnalysisReport({ result }) {
  const analysis = result.analysis || {};
  const score = Math.max(0, Math.min(100, Number(analysis.fraudProbability ?? 0)));
  const meta = getRiskMeta(score);
  const indicators = Array.isArray(analysis.indicators) ? analysis.indicators : [];
  const recommendations = Array.isArray(analysis.recommendations) ? analysis.recommendations : [];
  const [showExtracted, setShowExtracted] = useState(Boolean(result.extractedText));
  const scoreColor = score >= 70 ? '#f07171' : score >= 40 ? '#e5b361' : '#65c6a4';

  return (
    <div className="report-content">
      <div className="risk-summary">
        <div className="risk-copy">
          <span className={`risk-chip ${meta.className}`}><span /> {meta.short}</span>
          <h3>{analysis.verdict || meta.label}</h3>
          <p>{analysis.summary || 'Review the signals and verify the message independently.'}</p>
        </div>
        <div className="score-wrap">
          <div className="score-ring" style={{ '--score': score, '--score-color': scoreColor }}>
            <div className="score-inner"><strong>{score}<small>%</small></strong><span>RISK</span></div>
          </div>
        </div>
      </div>

      <div className="report-heading"><h4>Signals detected</h4><span>{indicators.length}</span></div>
      {indicators.length ? (
        <div className="signal-list">
          {indicators.slice(0, 5).map((item, index) => {
            const severity = (item.severity || 'medium').toLowerCase();
            return (
              <div className="signal-row" key={`${item.title || 'signal'}-${index}`}>
                <span className={`signal-mark ${severity}`}><CircleAlert size={14} /></span>
                <div className="signal-copy"><strong>{item.title || 'Potential warning sign'}</strong><p>{item.detail || 'Review this part of the message carefully.'}</p></div>
                <span className={`severity-label ${severity}`}>{severity}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-signals"><CheckCircle2 size={17} /><span>No specific signals were returned. A low score still does not prove the message is safe.</span></div>
      )}

      {result.extractedText && (
        <div className="extracted-block">
          <button type="button" className="extracted-toggle" onClick={() => setShowExtracted((value) => !value)}>
            <span><FileText size={14} /> Text extracted from image</span>
            <ChevronDown size={15} className={showExtracted ? 'chevron-open' : ''} />
          </button>
          {showExtracted && <div className="extracted-text">{result.extractedText}</div>}
        </div>
      )}

      <div className="report-heading"><h4>Recommended next steps</h4></div>
      <div className="recommendation-list">
        {(recommendations.length ? recommendations : ['Do not click unexpected links or share codes.', 'Contact the organization through its official app or website.']).slice(0, 4).map((item, index) => (
          <div className="recommendation-row" key={index}><span>{String(index + 1).padStart(2, '0')}</span><p>{typeof item === 'string' ? item : item.text}</p></div>
        ))}
      </div>

      <div className={`report-disclaimer ${result.mode === 'ai' ? 'ai-disclaimer' : ''}`}>
        <Info size={14} />
        <p>{result.modeNote || (result.mode === 'ai' ? 'Gemini-generated assessment. The percentage is not a statistically calibrated probability.' : 'Demo mode is active. Add GEMINI_API_KEY in server/.env to use Gemini.')}</p>
      </div>
    </div>
  );
}

export default App;
