/**
 * FilterTray.jsx
 * Mobile-first horizontal filter strip — exactly like CamScanner's bottom filter row.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Sliders, Loader2 } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';

const NORMAL_FILTERS = [
  { id: 'original',   label: 'Original'    },
  { id: 'lighten',    label: 'Lighten'     },
  { id: 'magicColor', label: 'Magic Color' },
  { id: 'bw',         label: 'B&W'         },
  { id: 'grayscale',  label: 'Grayscale'   },
  { id: 'eco',        label: 'Eco'         },
];

const PRO_FILTERS = [
  { id: 'omnifix',     label: 'Magic Pro'    },
  { id: 'noShadow',    label: 'No Shadow'    },
  { id: 'removeMoire', label: 'No Moiré'     },
  { id: 'flattenPage', label: 'Flatten Page', hasCurvature: true },
];

export default function FilterTray({ dataUrl, activeFilter, onFilterChange, onFilteredUrl }) {
  const { applyFilter }   = useFilters();
  const [curvature, setCurvature]     = useState(0.3);
  const [applying, setApplying]       = useState(false);
  const [applyingId, setApplyingId]   = useState(null);
  const [showSlider, setShowSlider]   = useState(false);
  const [activeTab, setActiveTab]     = useState('normal'); // 'normal' | 'pro'
  const previewRefs  = useRef({});
  const previewCache = useRef({});

  const renderPreview = useCallback(async (filterId, canvasEl) => {
    if (!dataUrl || !canvasEl) return;
    const cacheKey = `${filterId}-${dataUrl.slice(-20)}`;
    if (previewCache.current[cacheKey]) {
      const ctx = canvasEl.getContext('2d');
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
      img.src = previewCache.current[cacheKey];
      return;
    }
    try {
      const url = await applyFilter(dataUrl, filterId, { curvature });
      previewCache.current[cacheKey] = url;
      const ctx = canvasEl.getContext('2d');
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
      img.src = url;
    } catch (_) {}
  }, [dataUrl, applyFilter, curvature]);

  useEffect(() => { previewCache.current = {}; }, [dataUrl]);

  const handleSelect = useCallback(async (filterId, opts = {}) => {
    if (!dataUrl || applying) return;
    setApplying(true);
    setApplyingId(filterId);
    onFilterChange(filterId);
    try {
      const url = await applyFilter(dataUrl, filterId,
        filterId === 'flattenPage' ? { curvature } : opts
      );
      onFilteredUrl(url);
    } catch (_) {}
    setApplying(false);
    setApplyingId(null);
  }, [dataUrl, applyFilter, curvature, applying, onFilterChange, onFilteredUrl]);

  const filters = activeTab === 'normal' ? NORMAL_FILTERS : PRO_FILTERS;

  return (
    <div style={{
      background: 'var(--clr-bg-surface)',
      borderTop: '1px solid var(--clr-border)',
      flexShrink: 0,
    }}>
      {/* Tab switcher */}
      <div className="flex items-center gap-0" style={{ borderBottom: '1px solid var(--clr-border)', paddingLeft: 4 }}>
        <button
          className="flex items-center gap-1.5 px-3 py-2"
          style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', border: 'none',
            background: 'none', cursor: 'pointer',
            color: activeTab === 'normal' ? 'var(--clr-brand-400)' : 'var(--clr-text-muted)',
            borderBottom: activeTab === 'normal' ? '2px solid var(--clr-brand-400)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}
          onClick={() => setActiveTab('normal')}
        >
          <Sliders size={11} />
          FILTERS
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-2"
          style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', border: 'none',
            background: 'none', cursor: 'pointer',
            color: activeTab === 'pro' ? 'var(--clr-accent-400)' : 'var(--clr-text-muted)',
            borderBottom: activeTab === 'pro' ? '2px solid var(--clr-accent-400)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}
          onClick={() => setActiveTab('pro')}
        >
          <Sparkles size={11} style={{ color: activeTab === 'pro' ? 'var(--clr-accent-400)' : undefined }} />
          PRO AI
        </button>
        {applying && (
          <span className="flex items-center gap-1 ml-auto mr-3" style={{ color: 'var(--clr-brand-400)', fontSize: 11 }}>
            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            Applying...
          </span>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {filters.map(f => (
          <button
            key={f.id}
            className={`filter-chip flex-shrink-0 ${
              activeTab === 'pro' ? 'pro-chip' : ''
            } ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => {
              if (f.hasCurvature) setShowSlider(s => !s);
              handleSelect(f.id);
            }}
            title={f.label}
            style={{ opacity: applyingId && applyingId !== f.id ? 0.5 : 1 }}
          >
            {/* Preview canvas (only for normal filters) */}
            {activeTab === 'normal' && (
              <canvas
                width={60} height={44}
                style={{ borderRadius: 4, display: 'block', minWidth: 60, position: 'relative' }}
                ref={el => {
                  if (el && previewRefs.current[f.id] !== el) {
                    previewRefs.current[f.id] = el;
                    renderPreview(f.id, el);
                  }
                }}
              />
            )}
            {/* Pro filter badge */}
            {activeTab === 'pro' && (
              <div style={{
                width: 60, height: 44, borderRadius: 4,
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(14,165,233,0.2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(139,92,246,0.3)',
              }}>
                <Sparkles size={18} style={{ color: 'var(--clr-accent-400)' }} />
              </div>
            )}
            <span style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{f.label}</span>
            {applyingId === f.id && (
              <Loader2 size={10} style={{ animation: 'spin 1s linear infinite', color: 'var(--clr-brand-400)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Curvature slider for Flatten Page */}
      {showSlider && activeFilter === 'flattenPage' && (
        <div className="px-4 pb-2 flex items-center gap-3 fade-in">
          <span style={{ color: 'var(--clr-text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>Curvature</span>
          <input
            type="range" min={0} max={1} step={0.05}
            value={curvature}
            onChange={e => setCurvature(parseFloat(e.target.value))}
            onMouseUp={() => handleSelect('flattenPage')}
            onTouchEnd={() => handleSelect('flattenPage')}
            style={{ flex: 1 }}
          />
          <span style={{ color: 'var(--clr-brand-400)', fontSize: 11, minWidth: 28 }}>
            {curvature.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
