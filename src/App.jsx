/**
 * App.jsx — Root application component.
 * Wires together all hooks, layout, camera, editor, sidebar, and export.
 */
import { useState, useCallback, useEffect } from 'react';
import AppShell, { AppHeader, AppFooter } from './components/layout/AppShell';
import Sidebar          from './components/layout/Sidebar';
import ImageEditor      from './components/editor/ImageEditor';
import CameraView       from './components/camera/CameraView';
import ExportMenu       from './components/export/ExportMenu';
import ScanModeSelector from './components/camera/ScanModeSelector';
import { useCamera }       from './hooks/useCamera';
import { useScannedPages } from './hooks/useScannedPages';
import { Camera, Trash2, FolderOpen, Info } from 'lucide-react';

export default function App() {
  const camera = useCamera();
  const {
    pages, activePage, activePageId, setActivePageId,
    addPages, updatePage, removePage, reorderPages,
    clearAll, duplicatePage,
  } = useScannedPages();

  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanMode,   setScanMode]   = useState('standard');
  const [showInfo,   setShowInfo]   = useState(false);

  /* ── Handle new captures from CameraView ── */
  const handleCapture = useCallback(async (items, meta = {}) => {
    if (!items?.length) return;
    addPages(items, { label: meta.type || '' });
  }, [addPages]);

  /* ── Camera controls ── */
  const openCamera  = () => setCameraOpen(true);
  const closeCamera = () => setCameraOpen(false);

  /* ── Drag-and-drop file upload ── */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => addPages([ev.target.result]);
      reader.readAsDataURL(file);
    });
  }, [addPages]);

  const handleDragOver = (e) => e.preventDefault();

  /* ── Upload via file picker (EmptyState) ── */
  useEffect(() => {
    const handleUpload = (e) => addPages([e.detail]);
    window.addEventListener('lcam-upload', handleUpload);
    return () => window.removeEventListener('lcam-upload', handleUpload);
  }, [addPages]);

  return (
    <AppShell>
      {/* ── Header ── */}
      <AppHeader
        leftSlot={<ScanModeSelector mode={scanMode} onChange={setScanMode} />}
        rightSlot={
          <div className="flex items-center gap-2">
            {pages.length > 0 && (
              <button
                className="btn btn-danger btn-sm tooltip"
                data-tip="Clear all pages"
                onClick={() => { if (confirm('Clear all scanned pages?')) clearAll(); }}
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <ExportMenu pages={pages} />
            <button className="btn btn-primary" onClick={openCamera}>
              <Camera size={15} />
              <span className="hidden sm:inline">Scan</span>
            </button>
            <button
              className="btn btn-ghost btn-icon btn-sm tooltip"
              data-tip="About"
              onClick={() => setShowInfo(s => !s)}
            >
              <Info size={15} />
            </button>
          </div>
        }
      />

      {/* ── Main workspace ── */}
      <div
        className="flex flex-1 min-h-0 relative mobile-col"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Camera overlay — full viewport */}
        {cameraOpen && (
          <div className="absolute inset-0 z-50 fade-in" style={{ background: '#000' }}>
            <CameraView
              cameraHook={camera}
              scanMode={scanMode}
              onCapture={handleCapture}
              onClose={closeCamera}
            />
          </div>
        )}

        {/* Editor area */}
        {!cameraOpen && (
          <>
            {pages.length === 0
              ? <EmptyState onScan={openCamera} />
              : (
                <div className="flex flex-1 min-w-0 min-h-0">
                  <ImageEditor
                    page={activePage}
                    pages={pages}
                    activePageId={activePageId}
                    setActivePageId={setActivePageId}
                    onUpdate={updatePage}
                  />
                </div>
              )
            }

            {/* Thumbnail sidebar */}
            <Sidebar
              pages={pages}
              activePageId={activePageId}
              setActivePageId={setActivePageId}
              onRemove={removePage}
              onDuplicate={duplicatePage}
              onReorder={reorderPages}
              onScanNew={openCamera}
            />
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <AppFooter />

      {/* ── Info modal ── */}
      {showInfo && (
        <div className="modal-backdrop" onClick={() => setShowInfo(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, var(--clr-brand-500), var(--clr-accent-500))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Camera size={20} style={{ color: '#fff' }} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: 0 }}>
                  LCamScanner
                </h2>
                <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', margin: 0 }}>
                  AI-Powered Document Scanner
                </p>
              </div>
            </div>
            <div style={{ color: 'var(--clr-text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
              <p>✅ <strong>100% Private</strong> — all processing happens in your browser RAM. Zero data is sent to any server.</p>
              <p>✂️ <strong>Auto-Crop & Deskew</strong> — Instant perspective correction on every scan.</p>
              <p>🤖 <strong>AI Filters</strong> — Magic Pro, No Shadow, Remove Moiré, Flatten Page.</p>
              <p>📝 <strong>OCR</strong> — Extract text from scanned documents powered by Tesseract.js.</p>
              <p>📄 <strong>Export</strong> — PDF, JPEG, or TXT — all compiled locally.</p>
              <p>📷 <strong>Modes</strong> — Standard, Batch, ID Card, Book, Receipt.</p>
            </div>
            <button className="btn btn-primary w-full mt-4" onClick={() => setShowInfo(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ── Empty state when no pages scanned ── */
function EmptyState({ onScan }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-6 p-8 drop-zone"
      style={{ margin: 16, borderRadius: 16 }}
    >
      {/* Animated scanner icon */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <div style={{
          width: 120, height: 120, borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(139,92,246,0.12))',
          border: '1px solid var(--clr-border-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Camera size={48} style={{ color: 'var(--clr-brand-400)', opacity: 0.7 }} />
        </div>
        <div className="scan-line" style={{ inset: 0, position: 'absolute' }} />
      </div>

      <div className="text-center">
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
          background: 'linear-gradient(135deg, var(--clr-brand-400), var(--clr-accent-400))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          marginBottom: 8,
        }}>
          Start Scanning
        </h2>
        <p style={{ color: 'var(--clr-text-secondary)', fontSize: 14, maxWidth: 340 }}>
          Capture documents with your camera, or drag and drop image files here.
          All processing is private and stays on your device.
        </p>
      </div>

      {/* Feature chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {['Auto-Crop', 'AI Filters', 'OCR Text', 'PDF Export', 'Book Scan', 'ID Card'].map(f => (
          <span key={f} style={{
            fontSize: 11, fontWeight: 500,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(14,165,233,0.08)',
            border: '1px solid rgba(14,165,233,0.2)',
            color: 'var(--clr-brand-400)',
          }}>{f}</span>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <button className="btn btn-primary btn-lg" onClick={onScan}>
          <Camera size={17} />
          Open Camera
        </button>
        <label className="btn btn-ghost btn-lg" style={{ cursor: 'pointer' }}>
          <FolderOpen size={17} />
          Upload Images
          <input
            type="file" accept="image/*" multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              Array.from(e.target.files || []).forEach(file => {
                const reader = new FileReader();
                reader.onload = ev => {
                  window.dispatchEvent(new CustomEvent('lcam-upload', { detail: ev.target.result }));
                };
                reader.readAsDataURL(file);
              });
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <p style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>
        Or drag &amp; drop images anywhere on this screen
      </p>
    </div>
  );
}
