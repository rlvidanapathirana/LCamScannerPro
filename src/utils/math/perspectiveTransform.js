/**
 * perspectiveTransform.js
 * Pure JS implementation of a 4-point perspective warp.
 */

/**
 * Calculates a 3x3 transformation matrix mapping a unit square to a quadrilateral.
 * Points are [x, y] arrays.
 */
function getSquareToQuad(p0, p1, p2, p3) {
  const dx1 = p1[0] - p2[0], dy1 = p1[1] - p2[1];
  const dx2 = p3[0] - p2[0], dy2 = p3[1] - p2[1];
  const sx = p0[0] - p1[0] + p2[0] - p3[0];
  const sy = p0[1] - p1[1] + p2[1] - p3[1];
  const g = (sx * dy2 - dx2 * sy) / (dx1 * dy2 - dx2 * dy1);
  const h = (dx1 * sy - sx * dy1) / (dx1 * dy2 - dx2 * dy1);
  const a = p1[0] - p0[0] + g * p1[0];
  const b = p3[0] - p0[0] + h * p3[0];
  const c = p0[0];
  const d = p1[1] - p0[1] + g * p1[1];
  const e = p3[1] - p0[1] + h * p3[1];
  const f = p0[1];
  return [a, b, c, d, e, f, g, h, 1];
}

/** Inverts a 3x3 matrix */
function invertMatrix(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e*i - f*h, B = c*h - b*i, C = b*f - c*e;
  const D = f*g - d*i, E = a*i - c*g, F = c*d - a*f;
  const G = d*h - e*g, H = b*g - a*h, I = a*e - b*d;
  const det = a*A + b*D + c*G;
  if (det === 0) return null;
  return [A/det, B/det, C/det, D/det, E/det, F/det, G/det, H/det, I/det];
}

/** Multiply two 3x3 matrices */
function multiplyMatrices(a, b) {
  const c = new Array(9);
  for (let i=0; i<3; i++) {
    for (let j=0; j<3; j++) {
      c[i*3+j] = a[i*3+0]*b[0*3+j] + a[i*3+1]*b[1*3+j] + a[i*3+2]*b[2*3+j];
    }
  }
  return c;
}

/**
 * Calculates homography matrix from source quad to destination quad.
 */
function getHomography(srcQuad, dstQuad) {
  const s2q = getSquareToQuad(...dstQuad);
  const q2s = invertMatrix(getSquareToQuad(...srcQuad));
  if (!s2q || !q2s) return null;
  return multiplyMatrices(s2q, q2s);
}

/**
 * Warps an image defined by a data URL based on 4 corner points.
 * corners = [{x, y}, {x, y}, {x, y}, {x, y}] (TL, TR, BR, BL) in normalized coordinates (0 to 1).
 */
export async function applyPerspectiveTransform(dataUrl, corners) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;

      // Convert normalized corners to pixel coordinates
      const srcPoints = corners.map(c => [c.x * sw, c.y * sh]);

      // Calculate output dimensions based on max width/height of the quad
      const w1 = Math.hypot(srcPoints[0][0] - srcPoints[1][0], srcPoints[0][1] - srcPoints[1][1]);
      const w2 = Math.hypot(srcPoints[2][0] - srcPoints[3][0], srcPoints[2][1] - srcPoints[3][1]);
      const h1 = Math.hypot(srcPoints[1][0] - srcPoints[2][0], srcPoints[1][1] - srcPoints[2][1]);
      const h2 = Math.hypot(srcPoints[3][0] - srcPoints[0][0], srcPoints[3][1] - srcPoints[0][1]);
      
      const dw = Math.round(Math.max(w1, w2));
      const dh = Math.round(Math.max(h1, h2));
      
      if (dw === 0 || dh === 0) return resolve(dataUrl);

      const dstPoints = [
        [0, 0],
        [dw, 0],
        [dw, dh],
        [0, dh]
      ];

      const H = getHomography(dstPoints, srcPoints);
      if (!H) return resolve(dataUrl);

      // Draw original image to an offscreen canvas to get pixel data
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = sw;
      srcCanvas.height = sh;
      const srcCtx = srcCanvas.getContext('2d');
      srcCtx.drawImage(img, 0, 0);
      const srcData = srcCtx.getImageData(0, 0, sw, sh).data;

      // Create destination canvas
      const dstCanvas = document.createElement('canvas');
      dstCanvas.width = dw;
      dstCanvas.height = dh;
      const dstCtx = dstCanvas.getContext('2d');
      const dstImgData = dstCtx.createImageData(dw, dh);
      const dstData = dstImgData.data;

      // Map pixels using inverse homography
      for (let y = 0; y < dh; y++) {
        for (let x = 0; x < dw; x++) {
          const z = H[6]*x + H[7]*y + H[8];
          const sx = (H[0]*x + H[1]*y + H[2]) / z;
          const sy = (H[3]*x + H[4]*y + H[5]) / z;

          if (sx >= 0 && sx < sw - 1 && sy >= 0 && sy < sh - 1) {
            // Bilinear interpolation
            const x1 = Math.floor(sx), x2 = x1 + 1;
            const y1 = Math.floor(sy), y2 = y1 + 1;
            
            const dx = sx - x1, dy = sy - y1;
            
            const i11 = (y1 * sw + x1) * 4;
            const i12 = (y1 * sw + x2) * 4;
            const i21 = (y2 * sw + x1) * 4;
            const i22 = (y2 * sw + x2) * 4;

            const dstIdx = (y * dw + x) * 4;

            for (let c = 0; c < 3; c++) {
              const r1 = srcData[i11 + c] * (1 - dx) + srcData[i12 + c] * dx;
              const r2 = srcData[i21 + c] * (1 - dx) + srcData[i22 + c] * dx;
              dstData[dstIdx + c] = r1 * (1 - dy) + r2 * dy;
            }
            dstData[dstIdx + 3] = 255;
          }
        }
      }

      dstCtx.putImageData(dstImgData, 0, 0);
      resolve(dstCanvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => reject(new Error('Failed to load image for perspective transform'));
    img.src = dataUrl;
  });
}
