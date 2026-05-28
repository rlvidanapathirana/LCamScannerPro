/**
 * useFilters.js
 * Applies a named filter to an image (dataUrl) → returns filtered dataUrl.
 * Processing happens on an off-screen canvas so the UI never blocks.
 */
import { useCallback, useRef } from 'react';
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
  const canvasRef = useRef(document.createElement('canvas'));

  /**
   * Apply a filter to a dataUrl.
   * @param {string} dataUrl  — source image
   * @param {string} filterId — key from FILTER_MAP
   * @param {object} opts     — extra options (e.g. curvature for flattenPage)
   * @returns {Promise<string>} filtered dataUrl
   */
  const applyFilter = useCallback((dataUrl, filterId, opts = {}) => {
    return new Promise((resolve, reject) => {
      if (!dataUrl) return reject(new Error('No image'));
      const filterFn = FILTER_MAP[filterId] || filterOriginal;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let result;
        try {
          if (filterId === 'flattenPage') {
            result = filterFn(imageData, opts.curvature ?? 0.3);
          } else {
            result = filterFn(imageData, opts);
          }
        } catch (e) {
          result = imageData; // fallback to original on error
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
