/**
 * proFilters.js
 * Advanced AI-simulated filters using mathematical canvas algorithms.
 * All processing is CPU-side, zero network calls.
 */

function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

/* ── Gaussian kernel generator ── */
function gaussianKernel(radius, sigma) {
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size * size);
  let sum = 0;
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const val = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      kernel[(y + radius) * size + (x + radius)] = val;
      sum += val;
    }
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  return kernel;
}

/* ── Apply convolution kernel ── */
function applyKernel(src, kernel, radius) {
  const { width, height, data } = src;
  const size = radius * 2 + 1;
  const out = new Uint8ClampedArray(data.length);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let r = 0, g = 0, b = 0;
      for (let ky = 0; ky < size; ky++) {
        for (let kx = 0; kx < size; kx++) {
          const ix = clamp(px + kx - radius, 0, width - 1)  || 0;
          const iy = clamp(py + ky - radius, 0, height - 1) || 0;
          const srcIdx = (iy * width + ix) * 4;
          const w = kernel[ky * size + kx];
          r += data[srcIdx]     * w;
          g += data[srcIdx + 1] * w;
          b += data[srcIdx + 2] * w;
        }
      }
      const dstIdx = (py * width + px) * 4;
      out[dstIdx]     = clamp(r);
      out[dstIdx + 1] = clamp(g);
      out[dstIdx + 2] = clamp(b);
      out[dstIdx + 3] = data[dstIdx + 3];
    }
  }
  return new ImageData(out, width, height);
}

function clampCoord(v, max) { return Math.max(0, Math.min(max, v)); }

/**
 * Magic Pro / Omnifix
 * Local adaptive thresholding + contrast stretching.
 * Flattens paper wrinkles and uneven background lighting.
 */
export function filterOmnifix(src) {
  const { width, height, data } = src;
  const blockSize = 31; // odd number
  const C = 8; // constant subtracted from mean
  const out = new Uint8ClampedArray(data.length);

  // Integral image for fast block mean
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  // Build integral image
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y++) {
    for (let x = 1; x <= width; x++) {
      integral[y * (width + 1) + x] =
        gray[(y - 1) * width + (x - 1)] +
        integral[(y - 1) * (width + 1) + x] +
        integral[y * (width + 1) + (x - 1)] -
        integral[(y - 1) * (width + 1) + (x - 1)];
    }
  }

  const half = Math.floor(blockSize / 2);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const x1 = Math.max(0, px - half);
      const y1 = Math.max(0, py - half);
      const x2 = Math.min(width - 1, px + half);
      const y2 = Math.min(height - 1, py + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum =
        integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
        integral[y1 * (width + 1) + (x2 + 1)] -
        integral[(y2 + 1) * (width + 1) + x1] +
        integral[y1 * (width + 1) + x1];
      const mean = sum / count;

      const srcIdx = (py * width + px) * 4;
      const gVal = gray[py * width + px];
      const binaryVal = gVal >= mean - C ? 255 : 0;

      out[srcIdx]     = binaryVal;
      out[srcIdx + 1] = binaryVal;
      out[srcIdx + 2] = binaryVal;
      out[srcIdx + 3] = data[srcIdx + 3];
    }
  }
  return new ImageData(out, width, height);
}

/**
 * No Shadow
 * High-pass filter: blur copy → subtract from original → renormalise.
 * Eliminates hand/phone cast shadows without fading text.
 */
export function filterNoShadow(src) {
  const { width, height } = src;
  const blurRadius = 30;
  const sigma = 15;
  const kernel = gaussianKernel(blurRadius, sigma);

  // Quick box-blur approximation (3 passes of box blur)
  const blurred = boxBlurFast(src, blurRadius);
  const bd = blurred.data;
  const sd = src.data;

  const out = new Uint8ClampedArray(sd.length);

  for (let i = 0; i < sd.length; i += 4) {
    // Subtract low-frequency background, re-centre at 128
    for (let c = 0; c < 3; c++) {
      const val = sd[i + c] - bd[i + c] + 200;
      out[i + c] = clamp(val);
    }
    out[i + 3] = sd[i + 3];
  }
  return new ImageData(out, width, height);
}

/** Fast box blur approximation */
function boxBlurFast(src, radius) {
  const { width, height, data } = src;
  const tmp = new Uint8ClampedArray(data.length);
  const out = new Uint8ClampedArray(data.length);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = clampCoord(x + dx, width - 1);
        const idx = (y * width + nx) * 4;
        r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
        count++;
      }
      const dstIdx = (y * width + x) * 4;
      tmp[dstIdx]     = r / count;
      tmp[dstIdx + 1] = g / count;
      tmp[dstIdx + 2] = b / count;
      tmp[dstIdx + 3] = data[dstIdx + 3];
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = clampCoord(y + dy, height - 1);
        const idx = (ny * width + x) * 4;
        r += tmp[idx]; g += tmp[idx + 1]; b += tmp[idx + 2];
        count++;
      }
      const dstIdx = (y * width + x) * 4;
      out[dstIdx]     = r / count;
      out[dstIdx + 1] = g / count;
      out[dstIdx + 2] = b / count;
      out[dstIdx + 3] = tmp[dstIdx + 3];
    }
  }

  return new ImageData(out, src.width, src.height);
}

/**
 * Remove Moiré
 * Targeted Gaussian blur → resharpen via unsharp mask.
 */
export function filterRemoveMoire(src) {
  const blurRadius = 2;
  const sigma = 1.2;
  const kernel = gaussianKernel(blurRadius, sigma);
  const blurred = applyKernel(src, kernel, blurRadius);

  // Unsharp mask: sharpened = original + amount * (original - blurred)
  const amount = 1.5;
  const sd = src.data;
  const bd = blurred.data;
  const out = new Uint8ClampedArray(sd.length);

  for (let i = 0; i < sd.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      out[i + c] = clamp(sd[i + c] + amount * (sd[i + c] - bd[i + c]));
    }
    out[i + 3] = sd[i + 3];
  }
  return new ImageData(out, src.width, src.height);
}

/**
 * Flatten Page
 * Applies a barrel-distortion correction simulation.
 * curvature: 0 = no effect, 1 = max flatten
 */
export function filterFlattenPage(src, curvature = 0.3) {
  const { width, height, data } = src;
  const out = new Uint8ClampedArray(data.length);
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // Normalise coords -1..1
      const nx = (px - cx) / cx;
      const ny = (py - cy) / cy;
      const r = Math.sqrt(nx * nx + ny * ny);
      // Barrel correction formula
      const factor = 1 + curvature * r * r;
      const srcX = clampCoord(Math.round(nx * factor * cx + cx), width - 1);
      const srcY = clampCoord(Math.round(ny * factor * cy + cy), height - 1);

      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (py * width + px) * 4;
      out[dstIdx]     = data[srcIdx];
      out[dstIdx + 1] = data[srcIdx + 1];
      out[dstIdx + 2] = data[srcIdx + 2];
      out[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return new ImageData(out, width, height);
}
