/**
 * ImageEditor.jsx — Final, production-quality version.
 *
 * ROOT CAUSE FIXES:
 * 1. `viewRef` tracks the outer viewport div size.
 *    We pass explicit pixel max-constraints to the <img> so the
 *    inline-block wrapper shrinks to *exactly* the rendered image size.
 *    Without this, `maxWidth/maxHeight: 100%` on the image is
 *    circular (percentage of a parent that sizes from the child).
 *
 * 2. Overlays (CropPanel, AnnotationLayer) are children of the
 *    inline-block wrapper, so they position relative to the image.
 *
 * 3. `activeFilterRef` keeps a mutable ref in sync with activeFilter
 *    so the handleFilteredUrl callback never has stale closure state.
 *
 * 4. originalDataUrl is preserved before the FIRST crop so the user
 *    can re-crop from the pristine source any number of times.
 *
 * 5. Entering crop mode always re-runs edge-detection so it works on
 *    the current (possibly already-cropped) image.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  RotateCcw, FlipHorizontal2,
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
  page, pages, activePageId, setActivePageId, onUpdate,
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

  // The rendered pixel dimensions of the <img> element — used by overlays
  const [imgDims,  setImgDims]  = useState({ w: 300, h: 400 });
  // The inner pixel size of the viewport container (minus padding)
  const [viewSize, setViewSize] = useState({ w: 400, h: 600 });

  const bakeRef         = useRef(null);
  const imgRef          = useRef(null);
  const viewRef         = useRef(null);   // outer viewport div
  const activeFilterRef = useRef('original');

  /* ── Reset on page change ── */
  useEffect(() => {
    if (!page) return;
    setDisplayUrl(page.dataUrl);
    const f = page.filter || 'original';
    setActiveFilter(f);
    activeFilterRef.current = f;
    setRotation(0); setFlipH(false); setZoom(1);
    setShowCrop(false); setCropCorners(null);
    setShowAnnotation(false); setShowOcr(false);
  }, [page?.id]);

  /* ── Track viewport size → used to constrain the <img> ── */
  useEffect(() => {
    if (!viewRef.current) return;
    const PADDING = 32;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewSize({ w: Math.max(100, width - PADDING), h: Math.max(100, height - PADDING) });
    });
    obs.observe(viewRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── Track rendered image size → used by crop / annotation overlays ── */
  useEffect(() => {
    if (!imgRef.current) return;
    const obs = new ResizeObserver(() => {
      if (imgRef.current) {
        setImgDims({
          w: imgRef.current.offsetWidth  || 300,
          h: imgRef.current.offsetHeight || 400,
        });
      }
    });
    obs.observe(imgRef.current);
    return () => obs.disconnect();
  }, [displayUrl]);

  /* ── Filter callbacks ── */
  const handleFilteredUrl = useCallback((url) => {
    setDisplayUrl(url);
    if (page) onUpdate(page.id, { dataUrl: url, filter: activeFilterRef.current });
  }, [page, onUpdate]);

  const handleFilterChange = useCallback((id) => {
    setActiveFilter(id);
    activeFilterRef.current = id;
  }, []);

  /* ── Transform controls ── */
  const rotate       = (deg) => setRotation(r => r + deg);
  const resetTransform = ()  => { setRotation(0); setFlipH(false); setZoom(1); };

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
  const handleStartCrop = useCallback(async () => {
    const rawUrl = page.originalDataUrl || page.dataUrl;
    setDisplayUrl(rawUrl);
    setShowCrop(true);
    // Reset transforms so crop overlay coordinates match visual position
    setRotation(0); setFlipH(false); setZoom(1);

    // Always fresh-detect when entering crop
    setCropProcessing(true);
    setCropCorners(null);
    try {
      const corners = await detectDocumentCorners(rawUrl);
      setCropCorners(corners);
    } catch (e) {
      // Safe default: full-image rectangle with small margin
      setCropCorners([
        { x: 0.05, y: 0.05 }, { x: 0.95, y: 0.05 },
        { x: 0.95, y: 0.95 }, { x: 0.05, y: 0.95 },
      ]);
    }
    setCropProcessing(false);
  }, [page]);

  const handleApplyCrop = useCallback(async () => {
    if (!cropCorners) { setShowCrop(false); setDisplayUrl(page.dataUrl); return; }
    setCropProcessing(true);
    try {
      // Always warp from the pristine original
      const rawUrl    = page.originalDataUrl || page.dataUrl;
      const warpedUrl = await applyPerspectiveTransform(rawUrl, cropCorners);
      onUpdate(page.id, {
        dataUrl:         warpedUrl,
        originalDataUrl: rawUrl,      // ← preserve pristine source for re-crops
        cropCorners:     cropCorners,
      });
      setDisplayUrl(warpedUrl);
      setCropCorners(null);           // ← clear so next open re-detects on new image
    } catch (e) {
      console.error('Crop failed:', e);
      setDisplayUrl(page.dataUrl);
    }
    setCropProcessing(false);
    setShowCrop(false);
  }, [cropCorners, page, onUpdate]);

  const handleCancelCrop = useCallback(() => {
    setShowCrop(false);
    setCropCorners(null);
    setDisplayUrl(page.dataUrl);
  }, [page]);

  /* ── Guards ── */
  if (!page) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--clr-text-muted)' }}>
        <div style={{ fontSize: 64, opacity: 0.12 }}>📄</div>
        <p style={{ fontSize: 15 }}>No page selected</p>
      </div>
    );
  }

  const isCropMode       = showCrop;
  const isAnnotationMode = showAnnotation;

  // Image style — explicit pixel max-constraints break the circular-reference
  // problem where `maxWidth: 100%` would be relative to the inline-block parent
  // which itself sizes from the image.
  const imgStyle = {
    display:    'block',
    maxWidth:   viewSize.w,
    maxHeight:  viewSize.h,
    width:      'auto',
    height:     'auto',
    objectFit:  'contain',
    transform:  `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scale(${zoom})`,
    transition: 'transform 0.2s ease',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column', position: 'relative' }}>

      {/* ══════════════════════ TOP BAR ══════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', height: 48, flexShrink: 0,
        background: 'var(--clr-bg-surface)',
        borderBottom: '1px solid var(--clr-border)',
      }}>
        {/* Page nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => hasPrev && setActivePageId(pages[currentIdx - 1].id)}
                  disabled={!hasPrev}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ color: 'var(--clr-text-secondary)', fontSize: 13, fontWeight: 600, minWidth: 40, textAlign: 'center' }}>
            {currentIdx + 1} / {pages.length}
          </span>
          <button className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => hasNext && setActivePageId(pages[currentIdx + 1].id)}
                  disabled={!hasNext}>
            <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>
            <ZoomOut size={14} />
          </button>
          <span style={{ color: 'var(--clr-text-muted)', fontSize: 11, minWidth: 36, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setZoom(z => Math.min(4, z + 0.25))}>
            <ZoomIn size={14} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={resetTransform} style={{ marginLeft: 2 }}>
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* ══════════════════════ CANVAS VIEWPORT ══════════════════════ */}
      <div
        ref={viewRef}
        style={{
          flex: 1, minHeight: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', padding: 16,
          background: 'repeating-conic-gradient(#0f1116 0% 25%, #090c12 0% 50%) 0 0 / 20px 20px',
        }}
      >
        {/*
          ── Inline-block wrapper ──────────────────────────────────────
          Shrinks to exactly the rendered image size because the image
          has explicit pixel max-constraints from `viewSize`.
          All absolute-positioned overlays are relative to THIS div.
        */}
        <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
          <img
            ref={imgRef}
            src={displayUrl}
            alt="Scanned document page"
            style={imgStyle}
            draggable={false}
            onLoad={() => {
              if (imgRef.current) {
                setImgDims({ w: imgRef.current.offsetWidth, h: imgRef.current.offsetHeight });
              }
            }}
          />

          {/* Annotation overlay */}
          {isAnnotationMode && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: imgDims.w, height: imgDims.h, zIndex: 40 }}>
              <AnnotationLayer
                width={imgDims.w}
                height={imgDims.h}
                onBake={fn => { bakeRef.current = fn; }}
              />
            </div>
          )}

          {/* Crop overlay — only shown when corners are ready */}
          {isCropMode && cropCorners && !cropProcessing && (
            <CropPanel
              corners={cropCorners}
              onChange={setCropCorners}
              width={imgDims.w}
              height={imgDims.h}
            />
          )}

          {/* Crop processing spinner */}
          {isCropMode && cropProcessing && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 4,
              zIndex: 60,
            }}>
              <div style={{ textAlign: 'center', color: 'var(--clr-brand-400)' }}>
                <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10, letterSpacing: '0.04em' }}>
                  Detecting edges…
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OCR panel (slide-in) */}
      {showOcr && (
        <div className="slide-right" style={{
          position: 'absolute', top: 48, right: 0, bottom: 0,
          width: 300, zIndex: 30, display: 'flex', flexDirection: 'column',
        }}>
          <OcrPanel
            dataUrl={displayUrl}
            onTextExtracted={text => onUpdate(page.id, { ocrText: text })}
            onClose={() => setShowOcr(false)}
          />
        </div>
      )}

      {/* Filter tray */}
      {!isCropMode && !isAnnotationMode && (
        <FilterTray
          dataUrl={page.originalDataUrl || page.dataUrl}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          onFilteredUrl={handleFilteredUrl}
        />
      )}

      {/* ══════════════════════ BOTTOM NAV BAR ══════════════════════ */}
      <div className="editor-bottom-bar">
        {isCropMode ? (
          <>
            <button className="bottom-btn" onClick={handleCancelCrop}>
              <div className="bottom-btn-icon"><X size={20} /></div>
              <span>Cancel</span>
            </button>
            <button className="bottom-btn-confirm" onClick={handleApplyCrop} disabled={cropProcessing}>
              {cropProcessing
                ? <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
                : <Check size={26} />}
            </button>
            <button className="bottom-btn" onClick={handleStartCrop} disabled={cropProcessing}>
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
          <>
            <button className="bottom-btn" onClick={() => rotate(-90)}>
              <div className="bottom-btn-icon"><RotateCcw size={20} /></div>
              <span>Rotate</span>
            </button>
            <button className="bottom-btn" onClick={() => setFlipH(f => !f)}>
              <div className="bottom-btn-icon"><FlipHorizontal2 size={20} /></div>
              <span>Flip</span>
            </button>
            <button className="bottom-btn-confirm" onClick={handleStartCrop} title="Crop & Deskew">
              <Crop size={26} />
            </button>
            <button className={`bottom-btn ${isAnnotationMode ? 'bottom-btn-active' : ''}`}
                    onClick={() => setShowAnnotation(s => !s)}>
              <div className="bottom-btn-icon"><PenLine size={20} /></div>
              <span>Markup</span>
            </button>
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
