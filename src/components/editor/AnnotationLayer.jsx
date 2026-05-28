/**
 * AnnotationLayer.jsx
 * Transparent canvas overlay for freehand drawing, text notes, highlights, and watermark.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen, Type, Highlighter, Stamp, Trash2, Undo2, Download, Palette,
} from 'lucide-react';

const TOOLS = [
  { id: 'pen',       label: 'Pen',       icon: Pen },
  { id: 'highlight', label: 'Highlight', icon: Highlighter },
  { id: 'text',      label: 'Text',      icon: Type },
  { id: 'watermark', label: 'Watermark', icon: Stamp },
];

export default function AnnotationLayer({ width, height, onBake }) {
  const canvasRef    = useRef(null);
  const historyRef   = useRef([]);
  const isDrawingRef = useRef(false);

  const [tool, setTool]         = useState('pen');
  const [color, setColor]       = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [showWmPanel, setShowWmPanel] = useState(false);

  const getCtx = () => canvasRef.current?.getContext('2d');

  /* Save snapshot to history */
  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    historyRef.current.push(canvas.toDataURL());
    if (historyRef.current.length > 30) historyRef.current.shift();
  }, []);

  /* Undo last stroke */
  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !historyRef.current.length) return;
    const prev = historyRef.current.pop();
    const img  = new Image();
    const ctx  = getCtx();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = prev;
  }, []);

  /* Clear all annotations */
  const clearAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveSnapshot();
    getCtx().clearRect(0, 0, canvas.width, canvas.height);
  }, [saveSnapshot]);

  /* Draw watermark */
  const applyWatermark = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveSnapshot();
    const ctx = getCtx();
    ctx.save();
    ctx.globalAlpha = watermarkOpacity;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.font = `bold ${Math.min(canvas.width, canvas.height) * 0.1}px Syne, sans-serif`;
    ctx.fillStyle = '#ef4444';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(watermarkText, 0, 0);
    ctx.restore();
  }, [watermarkText, watermarkOpacity, saveSnapshot]);

  /* Text tool click handler */
  const handleTextClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top)  * scaleY;

    const text = prompt('Enter annotation text:');
    if (!text) return;
    saveSnapshot();
    const ctx = getCtx();
    ctx.font = `${lineWidth * 5 + 10}px Inter, sans-serif`;
    ctx.fillStyle = color;
    ctx.globalAlpha = 1;
    ctx.fillText(text, x, y);
  }, [color, lineWidth, saveSnapshot]);

  /* Pointer events for pen / highlight */
  const onPointerDown = useCallback((e) => {
    if (tool === 'text')      return handleTextClick(e);
    if (tool === 'watermark') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    saveSnapshot();
    isDrawingRef.current = true;

    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const ctx    = getCtx();

    ctx.beginPath();
    ctx.moveTo(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top)  * scaleY,
    );

    if (tool === 'highlight') {
      ctx.globalAlpha  = 0.35;
      ctx.strokeStyle  = color;
      ctx.lineWidth    = lineWidth * 8;
    } else {
      ctx.globalAlpha  = 1;
      ctx.strokeStyle  = color;
      ctx.lineWidth    = lineWidth;
    }
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    canvas.setPointerCapture(e.pointerId);
  }, [tool, color, lineWidth, saveSnapshot, handleTextClick]);

  const onPointerMove = useCallback((e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const ctx    = getCtx();
    ctx.lineTo(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top)  * scaleY,
    );
    ctx.stroke();
  }, []);

  const onPointerUp = useCallback(() => {
    isDrawingRef.current = false;
    getCtx()?.beginPath();
  }, []);

  /* Bake annotations onto a new dataUrl */
  const bakeAnnotations = useCallback((baseDataUrl) => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(baseDataUrl);
      const merged = document.createElement('canvas');
      merged.width  = canvas.width;
      merged.height = canvas.height;
      const mCtx   = merged.getContext('2d');
      const base   = new Image();
      base.onload  = () => {
        mCtx.drawImage(base, 0, 0);
        mCtx.drawImage(canvas, 0, 0);
        resolve(merged.toDataURL('image/jpeg', 0.93));
      };
      base.src = baseDataUrl;
    });
  }, []);

  // Expose bake to parent via callback ref
  useEffect(() => {
    if (onBake) onBake(bakeAnnotations);
  }, [bakeAnnotations, onBake]);

  const cursorMap = {
    pen:       'crosshair',
    highlight: 'crosshair',
    text:      'text',
    watermark: 'default',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
      {/* Annotation canvas */}
      <canvas
        ref={canvasRef}
        width={width || 800}
        height={height || 600}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          cursor: cursorMap[tool],
          pointerEvents: 'all',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      {/* Toolbar */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5"
           style={{ pointerEvents: 'all' }}>
        <div className="glass rounded-xl p-1.5 flex flex-col gap-1">
          {TOOLS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTool(t.id);
                  if (t.id === 'watermark') setShowWmPanel(s => !s);
                  else setShowWmPanel(false);
                }}
                className="btn btn-ghost btn-icon tooltip"
                data-tip={t.label}
                style={{
                  padding: 7,
                  background: tool === t.id ? 'rgba(14,165,233,0.15)' : 'transparent',
                  color: tool === t.id ? 'var(--clr-brand-400)' : 'var(--clr-text-secondary)',
                }}
              >
                <Icon size={15} />
              </button>
            );
          })}

          <div style={{ height: 1, background: 'var(--clr-border)', margin: '2px 4px' }} />

          <button onClick={undo} className="btn btn-ghost btn-icon tooltip" data-tip="Undo" style={{ padding: 7 }}>
            <Undo2 size={14} style={{ color: 'var(--clr-text-secondary)' }} />
          </button>
          <button onClick={clearAll} className="btn btn-danger btn-icon tooltip" data-tip="Clear" style={{ padding: 7 }}>
            <Trash2 size={14} />
          </button>
        </div>

        {/* Color + size controls */}
        <div className="glass rounded-xl p-2 flex flex-col gap-2">
          <label className="tooltip" data-tip="Color" style={{ cursor: 'pointer', lineHeight: 0 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: color,
              border: '2px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
            }} />
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
                   style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} />
          </label>
          <input type="range" min={1} max={10} value={lineWidth}
                 onChange={e => setLineWidth(+e.target.value)}
                 style={{ width: 24, writingMode: 'vertical-rl', direction: 'rtl', height: 60 }} />
        </div>
      </div>

      {/* Watermark panel */}
      {showWmPanel && (
        <div className="absolute top-3 left-20 glass rounded-xl p-3 fade-in"
             style={{ pointerEvents: 'all', minWidth: 220 }}>
          <p style={{ color: 'var(--clr-text-secondary)', fontSize: 11, marginBottom: 6 }}>Watermark text</p>
          <input
            type="text"
            value={watermarkText}
            onChange={e => setWatermarkText(e.target.value)}
            className="w-full mb-2"
          />
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: 'var(--clr-text-secondary)', fontSize: 11 }}>Opacity</span>
            <input type="range" min={0.05} max={0.9} step={0.05}
                   value={watermarkOpacity}
                   onChange={e => setWatermarkOpacity(+e.target.value)}
                   style={{ flex: 1 }} />
            <span style={{ color: 'var(--clr-brand-400)', fontSize: 11, minWidth: 28 }}>
              {Math.round(watermarkOpacity * 100)}%
            </span>
          </div>
          <button className="btn btn-primary btn-sm w-full" onClick={applyWatermark}>
            Apply Watermark
          </button>
        </div>
      )}
    </div>
  );
}
