/**
 * edgeDetection.js
 * 100% Client-Side OpenCV.js Edge Detection
 * Highly robust document boundary detection using Canny + Contours.
 */

import { waitForOpenCV } from '../cvLoader';

export async function detectDocumentCorners(dataUrl) {
  return new Promise(async (resolve) => {
    const defaultCorners = [
      { x: 0.05, y: 0.05 }, { x: 0.95, y: 0.05 },
      { x: 0.95, y: 0.95 }, { x: 0.05, y: 0.95 }
    ];

    try {
      await waitForOpenCV();
    } catch (e) {
      console.warn("OpenCV timeout, returning default corners");
      return resolve(defaultCorners);
    }

    const img = new Image();
    img.onload = () => {
      try {
        const mat = cv.imread(img);
        
        // Downscale for performance while retaining edge clarity
        const maxDim = 800;
        const scale = Math.min(1, maxDim / Math.max(mat.cols, mat.rows));
        
        const resized = new cv.Mat();
        cv.resize(mat, resized, new cv.Size(0, 0), scale, scale, cv.INTER_AREA);

        // Grayscale
        const gray = new cv.Mat();
        cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY, 0);

        // Blur to remove noise
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

        // Canny edge detection
        const edges = new cv.Mat();
        cv.Canny(blurred, edges, 75, 200, 3, false);

        // Dilate to close small gaps in the edges
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
        const dilated = new cv.Mat();
        cv.dilate(edges, dilated, kernel, new cv.Point(-1, -1), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

        // Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        let bestApprox = null;

        // Iterate to find the largest 4-point polygon
        for (let i = 0; i < contours.size(); ++i) {
          const cnt = contours.get(i);
          const area = cv.contourArea(cnt);
          
          if (area > maxArea) {
            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

            if (approx.rows === 4) {
              maxArea = area;
              if (bestApprox) bestApprox.delete();
              bestApprox = approx;
            } else {
              approx.delete();
            }
          }
          cnt.delete();
        }

        // If a valid document shape was found (must be at least 10% of the image area)
        if (bestApprox && maxArea > (resized.cols * resized.rows * 0.1)) {
          // Extract points and normalize to 0..1 range
          const pts = [];
          for (let i = 0; i < 4; i++) {
            pts.push({
              x: Math.max(0, Math.min(1, bestApprox.data32S[i * 2] / resized.cols)),
              y: Math.max(0, Math.min(1, bestApprox.data32S[i * 2 + 1] / resized.rows))
            });
          }
          
          // Sort points to guarantee TL, TR, BR, BL order
          pts.sort((a, b) => a.y - b.y); // Top 2 and Bottom 2
          const top = pts.slice(0, 2).sort((a, b) => a.x - b.x); // TL, TR
          const bottom = pts.slice(2, 4).sort((a, b) => b.x - a.x); // BR, BL
          
          const ordered = [top[0], top[1], bottom[0], bottom[1]];
          
          resolve(ordered);
        } else {
          resolve(defaultCorners);
        }

        // Memory management (Crucial in OpenCV.js)
        mat.delete(); resized.delete(); gray.delete(); blurred.delete(); 
        edges.delete(); dilated.delete(); kernel.delete(); 
        contours.delete(); hierarchy.delete();
        if (bestApprox) bestApprox.delete();

      } catch (err) {
        console.error("OpenCV edge detection failed:", err);
        resolve(defaultCorners);
      }
    };
    img.onerror = () => resolve(defaultCorners);
    img.src = dataUrl;
  });
}
