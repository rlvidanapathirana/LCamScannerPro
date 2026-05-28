/**
 * useFilters.js
 * Applies a named filter to an image (dataUrl) → returns filtered dataUrl.
 * FIX: Each call creates its own canvas to prevent concurrent-access black screens.
 */
import { useCallback } from 'react';
import {
  filterOriginal, filterLighten, filterMagicColor,
  filterBW, filterGrayscale, filterEco,
} from '../utils/filters/normalFilters';
import {
  filterOmnifix, filterNoShadow, filterRemoveMoire, filterFlattenPage,
} from '../utils/filters/proFilters';

const FILTER_MAP = {
  original:    filterOriginal,
  lighten:     filterLighten,
  magicColor:  filterMagicColor,
  bw:          filterBW,
  grayscale:   filterGrayscale,
  eco:         filterEco,
  omnifix:     filterOmnifix,
  noShadow:    filterNoShadow,
  removeMoire: filterRemoveMoire,
  flattenPage: filterFlattenPage,
};

export function useFilters() {
  /**
   * Apply a filter to a dataUrl.
   * Each call gets its OWN canvas — prevents concurrent preview renders from
   * wiping each other out and producing a black image.
   */
  const applyFilter = useCallback((dataUrl, filterId, opts = {}) => {
    return new Promise((resolve, reject) => {
      if (!dataUrl) return reject(new Error('No image'));
      const filterFn = FILTER_MAP[filterId] || filterOriginal;

      const img = new Image();
      img.onload = () => {
        // ── Fresh canvas every call — the key fix for the black-screen bug ──
        const canvas  = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let result;
        try {
          result = filterId === 'flattenPage'
            ? filterFn(imageData, opts.curvature ?? 0.3)
            : filterFn(imageData, opts);
        } catch (e) {
          console.error('Filter error:', filterId, e);
          result = imageData; // safe fallback
        }

        ctx.putImageData(result, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.93));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }, []);

  return { applyFilter, FILTER_MAP };
}
