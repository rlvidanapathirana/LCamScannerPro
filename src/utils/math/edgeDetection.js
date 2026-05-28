/**
 * edgeDetection.js
 * Highly robust document boundary detection using:
 * 1. Grayscale & blur
 * 2. Otsu's Thresholding
 * 3. Connected Component Labeling (Blob extraction)
 * 4. Finding the largest solid object
 * 5. Extreme point projection (Corners)
 */

export async function detectDocumentCorners(dataUrl) {
  return new Promise((resolve) => {
    const defaultCorners = [
      { x: 0.05, y: 0.05 }, { x: 0.95, y: 0.05 },
      { x: 0.95, y: 0.95 }, { x: 0.05, y: 0.95 }
    ];

    const img = new Image();
    img.onload = () => {
      // Downscale for extreme performance (150px max dim)
      const MAX_DIM = 150;
      const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.floor(img.naturalWidth * scale));
      const h = Math.max(1, Math.floor(img.naturalHeight * scale));
      const totalPixels = w * h;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // 1. Grayscale
      const gray = new Uint8Array(totalPixels);
      const hist = new Int32Array(256);
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const lum = Math.floor(0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2]);
        gray[i] = lum;
        hist[lum]++;
      }

      // 2. Otsu's Thresholding
      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * hist[i];
      let sumB = 0, wB = 0, wF = 0, varMax = 0, threshold = 0;
      for (let i = 0; i < 256; i++) {
        wB += hist[i];
        if (wB === 0) continue;
        wF = totalPixels - wB;
        if (wF === 0) break;
        sumB += i * hist[i];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const varBetween = wB * wF * (mB - mF) * (mB - mF);
        if (varBetween > varMax) {
          varMax = varBetween;
          threshold = i;
        }
      }

      // 3. Binary map
      // We assume the paper contrasts strongly with the desk.
      // Usually, paper is brighter than the desk.
      const binary = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        binary[i] = gray[i] > threshold ? 1 : 0;
      }

      // 4. Connected Components (Flood Fill)
      const labels = new Int32Array(totalPixels);
      let nextLabel = 1;
      const componentSizes = {};

      const floodFill = (startX, startY, label) => {
        const queue = [{ x: startX, y: startY }];
        labels[startY * w + startX] = label;
        let size = 0;

        let head = 0;
        while (head < queue.length) {
          const p = queue[head++];
          size++;
          // check neighbors
          const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
          for (let d of dirs) {
            const nx = p.x + d[0], ny = p.y + d[1];
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nIdx = ny * w + nx;
              if (binary[nIdx] === 1 && labels[nIdx] === 0) {
                labels[nIdx] = label;
                queue.push({ x: nx, y: ny });
              }
            }
          }
        }
        return size;
      };

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (binary[y * w + x] === 1 && labels[y * w + x] === 0) {
            const size = floodFill(x, y, nextLabel);
            componentSizes[nextLabel] = size;
            nextLabel++;
          }
        }
      }

      // 5. Find the largest component (Blob)
      let largestLabel = 0;
      let largestSize = 0;
      for (const [lbl, size] of Object.entries(componentSizes)) {
        if (size > largestSize) {
          largestSize = size;
          largestLabel = parseInt(lbl);
        }
      }

      // If the largest object is suspiciously small (less than 5% of image), fail gracefully
      if (largestSize < totalPixels * 0.05) {
        return resolve(defaultCorners);
      }

      // 6. Find Extreme Points (Corners) of ONLY the largest component
      let min_plus = Infinity, tl = null;
      let max_minus = -Infinity, tr = null;
      let max_plus = -Infinity, br = null;
      let min_minus = Infinity, bl = null;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (labels[y * w + x] === largestLabel) {
            const plus = x + y;
            const minus = x - y;

            if (plus < min_plus)   { min_plus = plus; tl = { x, y }; }
            if (minus > max_minus) { max_minus = minus; tr = { x, y }; }
            if (plus > max_plus)   { max_plus = plus; br = { x, y }; }
            if (minus < min_minus) { min_minus = minus; bl = { x, y }; }
          }
        }
      }

      if (tl && tr && br && bl) {
        // Expand slightly outwards to not clip the exact edges of the paper
        const expand = (pt, signX, signY) => ({
          x: Math.max(0, Math.min(1, (pt.x + signX * 2) / w)),
          y: Math.max(0, Math.min(1, (pt.y + signY * 2) / h))
        });
        
        resolve([
          expand(tl, -1, -1),
          expand(tr, 1, -1),
          expand(br, 1, 1),
          expand(bl, -1, 1)
        ]);
      } else {
        resolve(defaultCorners);
      }
    };
    
    img.onerror = () => resolve(defaultCorners);
    img.src = dataUrl;
  });
}
