/**
 * Sidebar.jsx
 * Vertical scrollable thumbnail strip on the right.
 * Shows all scanned pages with drag-to-reorder, delete, duplicate.
 */
import { useState, useRef } from 'react';
import { Trash2, Copy, GripVertical, Plus } from 'lucide-react';

export default function Sidebar({
  pages, activePageId, setActivePageId,
  onRemove, onDuplicate, onReorder, onScanNew,
}) {
  const dragIdx   = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (e, idx) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    setDragOver(idx);
  };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragIdx.current !== null && dragIdx.current !== idx) {
      onReorder(dragIdx.current, idx);
    }
    dragIdx.current = null;
    setDragOver(null);
  };
  const handleDragEnd = () => {
    dragIdx.current = null;
    setDragOver(null);
  };

  return (
    <div className="flex flex-col sidebar-container" style={{
      width: 140,
      background: 'var(--clr-bg-surface)',
      borderLeft: '1px solid var(--clr-border)',
      zIndex: 10,
    }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 sidebar-header" style={{ borderBottom: '1px solid var(--clr-border)', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-text-secondary)' }}>Pages ({pages.length})</span>
      </div>

      {/* Thumbnails */}
      <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-2 sidebar-scroll" style={{ minHeight: 0 }}>
        {pages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-6 w-full"
               style={{ color: 'var(--clr-text-muted)' }}>
            <div style={{ fontSize: 28, opacity: 0.25 }}>📄</div>
            <p style={{ fontSize: 10, textAlign: 'center' }}>No pages yet</p>
          </div>
        )}

        {pages.map((page, idx) => (
          <div
            key={page.id}
            className={`thumb-card ${activePageId === page.id ? 'selected' : ''}`}
            style={{ opacity: dragOver === idx ? 0.5 : 1 }}
            draggable
            onDragStart={e => handleDragStart(e, idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDrop={e => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onClick={() => setActivePageId(page.id)}
          >
            {/* Thumbnail image */}
            <div style={{ aspectRatio: '3/4', overflow: 'hidden', position: 'relative' }}>
              <img
                src={page.dataUrl}
                alt={`Page ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="lazy"
              />

              {/* Page number badge */}
              <div style={{
                position: 'absolute', bottom: 4, left: 4,
                background: 'rgba(0,0,0,0.65)',
                color: '#fff', fontSize: 9, fontWeight: 700,
                padding: '1px 5px', borderRadius: 3,
              }}>
                {idx + 1}
              </div>

              {/* Filter badge */}
              {page.filter && page.filter !== 'original' && (
                <div style={{
                  position: 'absolute', top: 3, right: 3,
                  background: 'rgba(14,165,233,0.8)',
                  color: '#fff', fontSize: 8,
                  padding: '1px 4px', borderRadius: 3,
                  fontWeight: 600, letterSpacing: '0.04em',
                }}>
                  {page.filter.toUpperCase().slice(0, 4)}
                </div>
              )}

              {/* OCR badge */}
              {page.ocrText && (
                <div style={{
                  position: 'absolute', top: 3, left: 3,
                  background: 'rgba(139,92,246,0.85)',
                  color: '#fff', fontSize: 8,
                  padding: '1px 4px', borderRadius: 3,
                  fontWeight: 600,
                }}>
                  OCR
                </div>
              )}

              {/* Drag handle */}
              <div style={{
                position: 'absolute', top: '50%', right: 3,
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'grab',
              }}>
                <GripVertical size={12} />
              </div>
            </div>

            {/* Page label */}
            {page.label && (
              <div style={{
                padding: '2px 4px',
                fontSize: 9, color: 'var(--clr-text-muted)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {page.label}
              </div>
            )}

            {/* Action buttons — show on hover */}
            <div className="absolute inset-x-0 bottom-0 flex"
                 style={{
                   opacity: 0,
                   background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                   padding: '12px 4px 4px',
                   transition: 'opacity 0.15s ease',
                 }}
                 onMouseEnter={e => e.currentTarget.style.opacity = 1}
                 onMouseLeave={e => e.currentTarget.style.opacity = 0}
            >
              <button
                onClick={e => { e.stopPropagation(); onDuplicate(page.id); }}
                className="flex-1 flex justify-center py-1"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}
                title="Duplicate"
              >
                <Copy size={11} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onRemove(page.id); }}
                className="flex-1 flex justify-center py-1"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-danger)' }}
                title="Delete"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add page button */}
      <div className="p-2 sidebar-header" style={{ borderTop: '1px solid var(--clr-border)', flexShrink: 0 }}>
        <button
          className="btn btn-ghost w-full btn-sm flex items-center justify-center gap-1"
          onClick={onScanNew}
          style={{ fontSize: 11 }}
        >
          <Plus size={12} />
          Add
        </button>
      </div>
    </div>
  );
}
