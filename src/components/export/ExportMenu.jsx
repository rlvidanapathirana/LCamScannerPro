/**
 * ExportMenu.jsx
 * Dropdown export panel — PDF, JPEG, TXT.
 */
import { useState, useRef, useEffect } from 'react';
import {
  FileDown, FileImage, FileText, ChevronDown,
  Loader2, CheckCircle, AlertCircle, X,
} from 'lucide-react';
import { useExport } from '../../hooks/useExport';

export default function ExportMenu({ pages }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const menuRef = useRef(null);
  const { exportPdf, exportJpeg, exportTxt, exporting, exportError } = useExport(pages);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handle = async (action, label) => {
    setOpen(false);
    try {
      await action();
      showToast(`${label} exported successfully!`);
    } catch (e) {
      showToast(`Export failed: ${e.message}`, 'error');
    }
  };

  const disabled = pages.length === 0;

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="btn btn-primary"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled || exporting}
        title={disabled ? 'Scan at least one page first' : ''}
      >
        {exporting
          ? <Loader2 size={14} className="animate-spin" />
          : <FileDown size={14} />
        }
        Export
        <ChevronDown size={12} style={{ marginLeft: 2, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 glass rounded-xl overflow-hidden fade-in"
             style={{ minWidth: 220, zIndex: 200, border: '1px solid var(--clr-border-light)', boxShadow: 'var(--shadow-modal)' }}>

          {/* Header */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--clr-border)', background: 'rgba(14,165,233,0.05)' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-display)' }}>
                Export Document
              </span>
              <span className="badge badge-new">{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--clr-text-muted)', marginTop: 2 }}>
              All processing stays in your browser
            </p>
          </div>

          {/* Options */}
          <div className="p-2 flex flex-col gap-1">
            <ExportOption
              icon={FileDown}
              label="Export as PDF"
              desc="All pages in one document"
              accent="var(--clr-brand-400)"
              onClick={() => handle(exportPdf, 'PDF')}
            />
            <ExportOption
              icon={FileImage}
              label="Export as JPEG"
              desc={`${pages.length} individual image file${pages.length !== 1 ? 's' : ''}`}
              accent="var(--clr-accent-400)"
              onClick={() => handle(exportJpeg, 'JPEG')}
            />
            <ExportOption
              icon={FileText}
              label="Export as TXT"
              desc="Aggregated OCR text output"
              accent="var(--clr-success)"
              onClick={() => handle(exportTxt, 'TXT')}
            />
          </div>

          {/* Error */}
          {exportError && (
            <div className="px-4 pb-3">
              <p style={{ fontSize: 11, color: 'var(--clr-danger)' }}>{exportError}</p>
            </div>
          )}
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl fade-in"
             style={{
               background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
               border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
               color: toast.type === 'error' ? 'var(--clr-danger)' : 'var(--clr-success)',
               zIndex: 999,
               boxShadow: 'var(--shadow-card)',
             }}>
          {toast.type === 'error'
            ? <AlertCircle size={15} />
            : <CheckCircle size={15} />
          }
          <span style={{ fontSize: 13 }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function ExportOption({ icon: Icon, label, desc, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg"
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--clr-bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: `${accent}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--clr-text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>{desc}</div>
      </div>
    </button>
  );
}
