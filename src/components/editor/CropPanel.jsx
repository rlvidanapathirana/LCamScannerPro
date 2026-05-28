/**
 * CropPanel.jsx
 * 8-point perspective crop overlay — exactly like CamScanner mobile.
 * 4 corner handles + 4 edge midpoint handles.
 *
 * FIX: SVG always has pointerEvents:'all' so handles are ALWAYS clickable.
 * Previously `pointerEvents: dragging ? 'all' : 'none'` meant you could
 * never START a drag because the SVG blocked its own events.
 */
import { useState, useRef, useEffect, useCallback } from 'react';

const HANDLE_R = 18; // touch-friendly radius

export default function CropPanel({ corners, onChange, width, height }) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  // dragging = { type: 'corner'|'edge', idx }

  /* ── Derive 4 midpoints ── */
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const [tl, tr, br, bl] = corners;
  const midpoints = [
    mid(tl, tr), // top
    mid(tr, br), // right
    mid(br, bl), // bottom
    mid(bl, tl), // left
  ];

  /* ── Normalised pointer coords relative to SVG ── */
  const getXY = useCallback((e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches?.[0] ?? e;
    return {
      nx: Math.max(0, Math.min(1, (touch.clientX - rect.left)  / rect.width)),
      ny: Math.max(0, Math.min(1, (touch.clientY - rect.top)   / rect.height)),
    };
  }, []);

  const onHandleDown = (type, idx) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging({ type, idx });
  };

  const onMove = useCallback((e) => {
    if (!dragging || !svgRef.current) return;
    e.preventDefault();
    const { nx, ny } = getXY(e);
    const next = [...corners];

    if (dragging.type === 'corner') {
      next[dragging.idx] = { x: nx, y: ny };
    } else {
      // Shift both adjacent corners by delta
      const pair = [[0,1],[1,2],[2,3],[3,0]][dragging.idx];
      const cur  = midpoints[dragging.idx];
      const dx   = nx - cur.x;
      const dy   = ny - cur.y;
      for (const i of pair) {
        next[i] = {
          x: Math.max(0, Math.min(1, corners[i].x + dx)),
          y: Math.max(0, Math.min(1, corners[i].y + dy)),
        };
      }
    }
    onChange(next);
  }, [dragging, corners, midpoints, getXY, onChange]);

  const onUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', onMove,  { passive: false });
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove,  { passive: false });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, [dragging, onMove, onUp]);

  /* ── Pixel coords ── */
  const px = (c) => ({ x: c.x * width, y: c.y * height });
  const [ptl, ptr, pbr, pbl] = corners.map(px);
  const pmids = midpoints.map(px);
  const polyPts = [ptl, ptr, pbr, pbl].map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{
        position:    'absolute',
        top: 0, left: 0,
        touchAction: 'none',
        zIndex:      50,
        /* ── KEY FIX: Always 'all' so onMouseDown on handles fires ── */
        pointerEvents: 'all',
        cursor: dragging ? 'grabbing' : 'default',
      }}
    >
      {/* Dark mask outside crop area */}
      <defs>
        <mask id="crop-mask-8pt">
          <rect width="100%" height="100%" fill="white" />
          <polygon points={polyPts} fill="black" />
        </mask>
      </defs>
      <rect
        width="100%" height="100%"
        fill="rgba(0,0,0,0.52)"
        mask="url(#crop-mask-8pt)"
        style={{ pointerEvents: 'none' }}
      />

      {/* Crop border */}
      <polygon
        points={polyPts}
        fill="none"
        stroke="rgba(45,212,191,0.95)"
        strokeWidth="2"
        strokeDasharray="7 4"
        style={{ pointerEvents: 'none' }}
      />

      {/* Rule-of-thirds grid */}
      {[1, 2].map(i => (
        <g key={i} style={{ pointerEvents: 'none' }}>
          <line
            x1={ptl.x + (ptr.x - ptl.x) * i / 3} y1={ptl.y + (ptr.y - ptl.y) * i / 3}
            x2={pbl.x + (pbr.x - pbl.x) * i / 3} y2={pbl.y + (pbr.y - pbl.y) * i / 3}
            stroke="rgba(255,255,255,0.18)" strokeWidth="1"
          />
          <line
            x1={ptl.x + (pbl.x - ptl.x) * i / 3} y1={ptl.y + (pbl.y - ptl.y) * i / 3}
            x2={ptr.x + (pbr.x - ptr.x) * i / 3} y2={ptr.y + (pbr.y - ptr.y) * i / 3}
            stroke="rgba(255,255,255,0.18)" strokeWidth="1"
          />
        </g>
      ))}

      {/* ── Corner handles ── */}
      {[ptl, ptr, pbr, pbl].map((pt, idx) => (
        <g
          key={`corner-${idx}`}
          style={{ pointerEvents: 'all', cursor: 'grab', touchAction: 'none' }}
          onMouseDown={onHandleDown('corner', idx)}
          onTouchStart={onHandleDown('corner', idx)}
        >
          {/* Large invisible hit zone for touch */}
          <circle cx={pt.x} cy={pt.y} r={30} fill="transparent" />
          {/* Glow ring */}
          <circle cx={pt.x} cy={pt.y} r={HANDLE_R + 4} fill="rgba(45,212,191,0.15)" stroke="rgba(45,212,191,0.7)" strokeWidth="1.5" />
          {/* Inner solid dot */}
          <circle cx={pt.x} cy={pt.y} r={HANDLE_R - 7} fill="rgba(45,212,191,1)" />
        </g>
      ))}

      {/* ── Edge midpoint handles ── */}
      {pmids.map((pt, idx) => (
        <g
          key={`mid-${idx}`}
          style={{ pointerEvents: 'all', cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={onHandleDown('edge', idx)}
          onTouchStart={onHandleDown('edge', idx)}
        >
          <circle cx={pt.x} cy={pt.y} r={26} fill="transparent" />
          <circle cx={pt.x} cy={pt.y} r={HANDLE_R - 4} fill="rgba(45,212,191,0.12)" stroke="rgba(45,212,191,0.75)" strokeWidth="1.5" />
          <circle cx={pt.x} cy={pt.y} r={5} fill="rgba(45,212,191,0.95)" />
        </g>
      ))}
    </svg>
  );
}
