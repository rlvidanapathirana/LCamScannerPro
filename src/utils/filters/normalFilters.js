/**
 * normalFilters.js
 * Pure canvas pixel-manipulation filters applied to an ImageData object.
 * Each function takes an ImageData and returns a NEW ImageData.
 */

/** ── Helpers ── */
function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

/** Original — passthrough */
export function filterOriginal(src) {
  return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
}

/** Lighten — uniform exposure boost (+50 to each channel) */
export function filterLighten(src, amount = 50) {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(d[i]     + amount);
    d[i + 1] = clamp(d[i + 1] + amount);
    d[i + 2] = clamp(d[i + 2] + amount);
  }
  return out;
}

/** Magic Color — whiten gray backgrounds, boost text saturation */
export function filterMagicColor(src) {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);

    if (lum > 160 && sat < 40) {
      // Gray/white background → whiten
      d[i] = d[i + 1] = d[i + 2] = clamp(lum + 60);
    } else if (lum < 100) {
      // Dark text → boost contrast + saturation
      const factor = 1.6;
      d[i]     = clamp(r * factor);
      d[i + 1] = clamp(g * factor);
      d[i + 2] = clamp(b * factor);
    } else {
      // Mid-tones → mild white pull
      const t = (lum - 100) / 60; // 0..1
      d[i]     = clamp(r + (255 - r) * t * 0.5);
      d[i + 1] = clamp(g + (255 - g) * t * 0.5);
      d[i + 2] = clamp(b + (255 - b) * t * 0.5);
    }
  }
  return out;
}

/** B&W — strict binary threshold (no grays) */
export function filterBW(src, threshold = 128) {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = lum >= threshold ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  return out;
}

/** Grayscale — pure luminosity conversion */
export function filterGrayscale(src) {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = clamp(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = d[i + 1] = d[i + 2] = lum;
  }
  return out;
}

/**
 * Eco — contrast-optimised for low toner printing.
 * Lifts mid-tones slightly, compresses deep blacks to ~80% to save ink.
 */
export function filterEco(src) {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const d = out.data;
  // Build LUT: darks → 80% density, whites → pure white, mid-tones → slight boost
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    if (v < 50)        lut[v] = clamp(v * 0.8);
    else if (v < 180)  lut[v] = clamp(v * 1.1);
    else               lut[v] = 255;
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
  return out;
}
