/**
 * ImageEditor.jsx
 * CamScanner-style Mobile Layout:
 * - Simple top bar (back + page counter)
 * - Full canvas viewport
 * - Filter tray docked above bottom bar
 * - Bottom navigation bar (Rotate, Markup, OCR, Save)
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight,
  RotateCcw, RotateCw, FlipHorizontal2,
  ScanText, PenLine, Crop, Loader2,
  Check, X, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';
import FilterTray      from './FilterTray';
import AnnotationLayer from './AnnotationLayer';
import OcrPanel        from './OcrPanel';
import CropPanel       from './CropPanel';
import { detectDocumentCorners }    from '../../utils/math/edgeDetection';
import { applyPerspectiveTransform } from '../../utils/math/perspectiveTransform';

export default function ImageEditor({
  page, pages, activePageId, setActivePageId,
  onUpdate,
}) {
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [showOcr,        setShowOcr]        = useState(false);
  const [showCrop,       setShowCrop]       = useState(false);
  const [rotation,       setRotation]       = useState(0);
  const [flipH,          setFlipH]          = useState(false);
  const [zoom,           setZoom]           = useState(1);
  const [activeFilter,   setActiveFilter]   = useState('original');
  const [displayUrl,     setDisplayUrl]     = useState(null);
  const [cropCorners,    setCropCorners]    = useState(null);
  const [cropProcessing, setCropProcessing] = useState(false);

  // Dimensions of the rendered <img> element for overlays
  const [imgDims, setImgDims] = useState({ w: 1, h: 1 });

  const bakeRef  = useRef(null);
  const imgRef   = useRef(null);
  const wrapRef  = useRef(null);

  /* ── Reset when page changes ── */
  useEffect(() => {
    if (page) {
      setDisplayUrl(page.dataUrl);
      setActiveFilter(page.filter || 'original');
      setRotation(0); setFlipH(false); setZoom(1);
      setShowCrop(false); setCropCorners(null);
      setShowAnnotation(false); setShowOcr(false);
    }
  }, [page?.id]);

  /* ── Track rendered image size for overlays ── */
  useEffect(() => {
    if (!imgRef.current) return;
    const obs = new ResizeObserver(() => {
      if (imgRef.current) {
        setImgDims({
          w: imgRef.current.clientWidth  || 1,
          h: imgRef.current.clientHeight || 1,
        });
      }
    });
    obs.observe(imgRef.current);
    return () => obs.disconnect();
  }, [displayUrl]);

  /* ── Filter applied callback ── */
  const handleFilteredUrl = useCallback((url) => {
    setDisplayUrl(url);
    if (page) onUpdate(page.id, { dataUrl: url, filter: activeFilter });
  }, [page, activeFilter, onUpdate]);

  const handleFilterChange = useCallback((id) => setActiveFilter(id), []);

  /* ── Transform controls ── */
  const rotate = (deg) => setRotation(r => r + deg);
  const resetTransform = () => { setRotation(0); setFlipH(false); setZoom(1); };

  /* ── Page navigation ── */
  const currentIdx = pages.findIndex(p => p.id === activePageId);
  const hasPrev    = currentIdx > 0;
  const hasNext    = currentIdx < pages.length - 1;

  /* ── Annotation bake ── */
  const handleBake = useCallback(async () => {
    if (!bakeRef.current || !displayUrl) return;
    const baked = await bakeRef.current(displayUrl);
    setDisplayUrl(baked);
    onUpdate(page.id, { dataUrl: baked });
    setShowAnnotation(false);
  }, [displayUrl, page, onUpdate]);

  /* ── Crop workflow ── */
  const handleStartCrop = async () => {
    const rawUrl = page.originalDataUrl || page.dataUrl;
    setDisplayUrl(rawUrl);
    setShowCrop(true);

    if (!cropCorners) {
      setCropProcessing(true);
      const corners = page.cropCorners || await detectDocumentCorners(rawUrl);
      setCropCorners(corners);
      setCropProcessing(false);
    }
  };

  const handleApplyCrop = async () => {
    if (!cropCorners) { setShowCrop(false); setDisplayUrl(page.dataUrl); return; }
    setCropProcessing(true);
    try {
      const rawUrl   = page.originalDataUrl || page.dataUrl;
      const warpedUrl = await applyPerspectiveTransform(rawUrl, cropCorners);
      onUpdate(page.id, { dataUrl: warpedUrl, cropCorners });
      setDisplayUrl(warpedUrl);
    } catch (e) { console.error(e); setDisplayUrl(page.dataUrl); }
    setCropProcessing(false);
    setShowCrop(false);
  };

  const handleCancelCrop = () => {
    setShowCrop(false);
    setDisplayUrl(page.dataUrl);
  };

  if (!page) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4"
           style={{ color: 'var(--clr-text-muted)' }}>
        <div style={{ fontSize: 64, opacity: 0.15 }}>📄</div>
        <p style={{ fontSize: 15 }}>No page selected</p>
      </div>
    );
  }

  const transformStyle = {
    transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scale(${zoom})`,
    transition: 'transform 0.2s ease',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    display: 'block',
  };

  const isCropMode       = showCrop;
  const isAnnotationMode = showAnnotation;

  return (
    <div className="flex flex-1 min-h-0" style={{ flexDirection: 'column', position: 'relative' }}>

      {/* ══════════════ TOP BAR ══════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', height: 48, flexShrink: 0,
        background: 'var(--clr-bg-surface)',
        borderBottom: '1px solid var(--clr-border)',
      }}>
        {/* Page navigation left */}
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => hasPrev && setActivePageId(pages[currentIdx - 1].id)}
                  disabled={!hasPrev}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ color: 'var(--clr-text-secondary)', fontSize: 13, fontWeight: 600 }}>
            {currentIdx + 1} / {pages.length}
          </span>
          <button className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => hasNext && setActivePageId(pages[currentIdx + 1].id)}
                  disabled={!hasNext}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>
            <ZoomOut size={14} />
          </button>
          <span style={{ color: 'var(--clr-text-muted)', fontSize: 11, minWidth: 34, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setZoom(z => Math.min(4, z + 0.25))}>
            <ZoomIn size={14} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm tooltip" data-tip="Reset view"
                  onClick={resetTransform} style={{ marginLeft: 2 }}>
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* ══════════════ CANVAS VIEWPORT ══════════════ */}
      <div
        ref={wrapRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{ background: 'repeating-conic-gradient(#0f1116 0% 25%, #090c12 0% 50%) 0 0 / 20px 20px' }}
      >
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: '100%', padding: 16 }}>
          <img
            ref={imgRef}
            src={displayUrl}
            alt="Scanned page"
            style={transformStyle}
            draggable={false}
            onLoad={() => {
              if (imgRef.current) setImgDims({
                w: imgRef.current.clientWidth,
                h: imgRef.current.clientHeight,
              });
            }}
          />

          {/* Annotation overlay */}
          {isAnnotationMode && (
            <AnnotationLayer
              width={imgDims.w || 800}
              height={imgDims.h || 600}
              onBake={fn => { bakeRef.current = fn; }}
            />
          )}

          {/* Crop overlay */}
          {isCropMode && cropCorners && !cropProcessing && (
            <CropPanel
              corners={cropCorners}
              onChange={setCropCorners}
              width={imgDims.w || 800}
              height={imgDims.h || 600}
            />
          )}

          {/* Crop processing spinner */}
          {isCropMode && cropProcessing && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
            }}>
              <div style={{ textAlign: 'center', color: 'var(--clr-brand-400)' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 500 }}>Detecting edges…</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ OCR PANEL (slide-in) ══════════════ */}
      {showOcr && (
        <div className="slide-right" style={{
          position: 'absolute', top: 48, right: 0, bottom: 0,
          width: 300, zIndex: 30,
          display: 'flex', flexDirection: 'column',
        }}>
          <OcrPanel
            dataUrl={displayUrl}
            onTextExtracted={text => onUpdate(page.id, { ocrText: text })}
            onClose={() => setShowOcr(false)}
          />
        </div>
      )}

      {/* ══════════════ FILTER TRAY ══════════════ */}
      {!isCropMode && !isAnnotationMode && (
        <FilterTray
          dataUrl={page.originalDataUrl || page.dataUrl}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          onFilteredUrl={handleFilteredUrl}
        />
      )}

      {/* ══════════════ BOTTOM NAV BAR ══════════════ */}
      <div className="editor-bottom-bar">

        {/* Crop mode controls */}
        {isCropMode ? (
          <>
            <button className="bottom-btn" onClick={handleCancelCrop}>
              <div className="bottom-btn-icon"><X size={20} /></div>
              <span>Cancel</span>
            </button>
            <button className="bottom-btn-confirm" onClick={handleApplyCrop} disabled={cropProcessing}>
              {cropProcessing
                ? <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
                : <Check size={26} />
              }
            </button>
            <button className="bottom-btn" onClick={() => { setCropCorners(null); handleStartCrop(); }}>
              <div className="bottom-btn-icon"><Crop size={20} /></div>
              <span>Re-detect</span>
            </button>
          </>
        ) : isAnnotationMode ? (
          <>
            <button className="bottom-btn" onClick={() => setShowAnnotation(false)}>
              <div className="bottom-btn-icon"><X size={20} /></div>
              <span>Cancel</span>
            </button>
            <button className="bottom-btn-confirm" onClick={handleBake}>
              <Check size={26} />
            </button>
            <div className="bottom-btn" style={{ opacity: 0, pointerEvents: 'none' }} />
          </>
        ) : (
          /* Default nav */
          <>
            {/* Rotate */}
            <button className="bottom-btn" onClick={() => rotate(-90)}>
              <div className="bottom-btn-icon"><RotateCcw size={20} /></div>
              <span>Rotate</span>
            </button>

            {/* Flip */}
            <button className="bottom-btn" onClick={() => setFlipH(f => !f)}>
              <div className="bottom-btn-icon"><FlipHorizontal2 size={20} /></div>
              <span>Flip</span>
            </button>

            {/* CROP — centre hero button */}
            <button className="bottom-btn-confirm" onClick={handleStartCrop} title="Crop & Deskew">
              <Crop size={26} />
            </button>

            {/* Markup / Annotate */}
            <button className={`bottom-btn ${isAnnotationMode ? 'bottom-btn-active' : ''}`}
                    onClick={() => setShowAnnotation(s => !s)}>
              <div className="bottom-btn-icon"><PenLine size={20} /></div>
              <span>Markup</span>
            </button>

            {/* OCR */}
            <button className={`bottom-btn ${showOcr ? 'bottom-btn-active' : ''}`}
                    onClick={() => setShowOcr(s => !s)}>
              <div className="bottom-btn-icon"><ScanText size={20} /></div>
              <span>To text</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
