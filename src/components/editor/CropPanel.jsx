/**
 * CropPanel.jsx
 * 8-point perspective crop overlay — exactly like CamScanner mobile.
 * 4 corner handles + 4 edge midpoint handles.
 * Styled with translucent light-blue circles and dashed border.
 */
import { useState, useRef, useEffect, useCallback } from 'react';

const HANDLE_R = 14; // radius of handles (px)

export default function CropPanel({ corners, onChange, width, height }) {
  const svgRef      = useRef(null);
  const [dragging, setDragging] = useState(null);
  // dragging = { type: 'corner', idx } | { type: 'edge', idx }

  /* ── Derive 4 midpoints from corners ── */
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const [tl, tr, br, bl] = corners;
  const midpoints = [
    mid(tl, tr), // top
    mid(tr, br), // right
    mid(br, bl), // bottom
    mid(bl, tl), // left
  ];

  /* ── Pointer helpers ── */
  const getXY = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      nx: Math.max(0, Math.min(1, (cx - rect.left) / rect.width)),
      ny: Math.max(0, Math.min(1, (cy - rect.top)  / rect.height)),
    };
  };

  const onPointerDown = (type, idx) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging({ type, idx });
  };

  const onPointerMove = useCallback((e) => {
    if (!dragging || !svgRef.current) return;
    e.preventDefault();
    const { nx, ny } = getXY(e);
    const next = [...corners];

    if (dragging.type === 'corner') {
      next[dragging.idx] = { x: nx, y: ny };
    } else {
      // Moving edge midpoint: shift both adjacent corners uniformly
      const edgeCorners = [[0,1],[1,2],[2,3],[3,0]][dragging.idx];
      const cur = midpoints[dragging.idx];
      const dx = nx - cur.x;
      const dy = ny - cur.y;
      next[edgeCorners[0]] = { x: corners[edgeCorners[0]].x + dx, y: corners[edgeCorners[0]].y + dy };
      next[edgeCorners[1]] = { x: corners[edgeCorners[1]].x + dx, y: corners[edgeCorners[1]].y + dy };
      // Clamp
      for (let i of edgeCorners) {
        next[i] = {
          x: Math.max(0, Math.min(1, next[i].x)),
          y: Math.max(0, Math.min(1, next[i].y)),
        };
      }
    }
    onChange(next);
  }, [dragging, corners, midpoints, onChange]);

  const onPointerUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove',  onPointerMove, { passive: false });
      window.addEventListener('mouseup',    onPointerUp);
      window.addEventListener('touchmove',  onPointerMove, { passive: false });
      window.addEventListener('touchend',   onPointerUp);
    }
    return () => {
      window.removeEventListener('mousemove',  onPointerMove);
      window.removeEventListener('mouseup',    onPointerUp);
      window.removeEventListener('touchmove',  onPointerMove);
      window.removeEventListener('touchend',   onPointerUp);
    };
  }, [dragging, onPointerMove, onPointerUp]);

  /* ── Convert normalised → pixel ── */
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
        position:      'absolute',
        top: 0, left: 0,
        pointerEvents: dragging ? 'all' : 'none',
        touchAction:   'none',
        zIndex: 50,
      }}
    >
      {/* Dark mask outside crop area */}
      <defs>
        <mask id="crop-mask-8pt">
          <rect width="100%" height="100%" fill="white" />
          <polygon points={polyPts} fill="black" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#crop-mask-8pt)" />

      {/* Crop border */}
      <polygon
        points={polyPts}
        fill="none"
        stroke="rgba(45,212,191,0.9)"
        strokeWidth="2"
        strokeDasharray="6 4"
      />

      {/* Inner grid (rule of thirds) */}
      {[1,2].map(i => (
        <g key={i}>
          <line
            x1={ptl.x + (ptr.x - ptl.x)*i/3} y1={ptl.y + (ptr.y - ptl.y)*i/3}
            x2={pbl.x + (pbr.x - pbl.x)*i/3} y2={pbl.y + (pbr.y - pbl.y)*i/3}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1"
          />
          <line
            x1={ptl.x + (pbl.x - ptl.x)*i/3} y1={ptl.y + (pbl.y - ptl.y)*i/3}
            x2={ptr.x + (pbr.x - ptr.x)*i/3} y2={ptr.y + (pbr.y - ptr.y)*i/3}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1"
          />
        </g>
      ))}

      {/* 4 Corner handles — square + circle like CamScanner */}
      {[ptl, ptr, pbr, pbl].map((pt, idx) => (
        <g key={`corner-${idx}`} style={{ pointerEvents: 'all', cursor: 'grab', touchAction: 'none' }}
           onMouseDown={onPointerDown('corner', idx)}
           onTouchStart={onPointerDown('corner', idx)}
        >
          {/* Large invisible hit area */}
          <circle cx={pt.x} cy={pt.y} r={28} fill="transparent" />
          {/* Outer ring */}
          <circle cx={pt.x} cy={pt.y} r={HANDLE_R + 3} fill="rgba(45,212,191,0.2)" stroke="rgba(45,212,191,0.8)" strokeWidth="1.5" />
          {/* Inner dot */}
          <circle cx={pt.x} cy={pt.y} r={HANDLE_R - 6} fill="rgba(45,212,191,0.9)" />
        </g>
      ))}

      {/* 4 Edge midpoint handles */}
      {pmids.map((pt, idx) => (
        <g key={`mid-${idx}`} style={{ pointerEvents: 'all', cursor: 'crosshair', touchAction: 'none' }}
           onMouseDown={onPointerDown('edge', idx)}
           onTouchStart={onPointerDown('edge', idx)}
        >
          <circle cx={pt.x} cy={pt.y} r={24} fill="transparent" />
          <circle cx={pt.x} cy={pt.y} r={HANDLE_R - 2} fill="rgba(45,212,191,0.15)" stroke="rgba(45,212,191,0.7)" strokeWidth="1.5" />
          <circle cx={pt.x} cy={pt.y} r={4} fill="rgba(45,212,191,0.9)" />
        </g>
      ))}
    </svg>
  );
}
