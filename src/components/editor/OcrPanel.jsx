/**
 * OcrPanel.jsx
 * Tesseract.js OCR side panel — extract, display, edit, copy text.
 */
import { useState } from 'react';
import { ScanText, Copy, CheckCheck, X, Languages, Loader2 } from 'lucide-react';
import { useOcr } from '../../hooks/useOcr';

const LANG_OPTIONS = [
  { value: 'eng', label: 'English' },
  { value: 'sin', label: 'Sinhala' },
  { value: 'fra', label: 'French' },
  { value: 'deu', label: 'German' },
  { value: 'spa', label: 'Spanish' },
  { value: 'chi_sim', label: 'Chinese (Simplified)' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'ara', label: 'Arabic' },
];

export default function OcrPanel({ dataUrl, onTextExtracted, onClose }) {
  const { ocrText, setOcrText, ocrProgress, ocrRunning, ocrError, runOcr, clearOcr } = useOcr();
  const [lang, setLang]       = useState('eng');
  const [copied, setCopied]   = useState(false);

  const handleRun = async () => {
    await runOcr(dataUrl, lang);
    if (ocrText) onTextExtracted?.(ocrText);
  };

  const handleCopy = () => {
    if (!ocrText) return;
    navigator.clipboard.writeText(ocrText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="ocr-panel slide-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
           style={{ borderBottom: '1px solid var(--clr-border)', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <ScanText size={16} style={{ color: 'var(--clr-brand-400)' }} />
          <span style={{ fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-display)' }}>
            Text Extraction
          </span>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      {/* Language selector */}
      <div className="px-4 pt-3 pb-2" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Languages size={13} style={{ color: 'var(--clr-text-muted)' }} />
          <span style={{ fontSize: 11, color: 'var(--clr-text-muted)', fontWeight: 600, letterSpacing: '0.06em' }}>
            LANGUAGE
          </span>
        </div>
        <select value={lang} onChange={e => setLang(e.target.value)} className="w-full">
          {LANG_OPTIONS.map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Run button */}
      <div className="px-4 pb-3" style={{ flexShrink: 0 }}>
        <button
          className="btn btn-primary w-full"
          onClick={handleRun}
          disabled={ocrRunning || !dataUrl}
        >
          {ocrRunning
            ? <><Loader2 size={14} className="animate-spin" /> Recognising... {ocrProgress}%</>
            : <><ScanText size={14} /> Extract Text (OCR)</>
          }
        </button>

        {/* Progress bar */}
        {ocrRunning && (
          <div className="progress-bar mt-2">
            <div className="progress-bar-fill" style={{ width: `${ocrProgress}%` }} />
          </div>
        )}

        {ocrError && (
          <p className="mt-2 text-xs" style={{ color: 'var(--clr-danger)' }}>{ocrError}</p>
        )}
      </div>

      {/* Text output */}
      <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
        {ocrText ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 11, color: 'var(--clr-text-muted)', fontWeight: 600, letterSpacing: '0.06em' }}>
                EXTRACTED TEXT
              </span>
              <div className="flex gap-1">
                <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
                  {copied
                    ? <><CheckCheck size={12} style={{ color: 'var(--clr-success)' }} /> Copied</>
                    : <><Copy size={12} /> Copy</>
                  }
                </button>
                <button className="btn btn-ghost btn-sm" onClick={clearOcr}
                        style={{ color: 'var(--clr-text-muted)' }}>
                  Clear
                </button>
              </div>
            </div>
            <textarea
              value={ocrText}
              onChange={e => {
                setOcrText(e.target.value);
                onTextExtracted?.(e.target.value);
              }}
              className="flex-1 w-full resize-none"
              style={{
                minHeight: 0,
                fontSize: 13,
                lineHeight: 1.7,
                fontFamily: 'var(--font-body)',
              }}
              placeholder="Extracted text will appear here…"
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3"
               style={{ color: 'var(--clr-text-muted)' }}>
            <ScanText size={36} style={{ opacity: 0.3 }} />
            <p className="text-sm text-center">
              Click "Extract Text" to run<br />AI-powered OCR on this page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
