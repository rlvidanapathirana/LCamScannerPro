/**
 * perspectiveTransform.js
 * 100% Client-Side OpenCV.js Perspective Transform
 * High-performance, mathematically perfect cropping.
 */

import { waitForOpenCV } from '../cvLoader';

export async function applyPerspectiveTransform(dataUrl, corners) {
  return new Promise(async (resolve, reject) => {
    try {
      await waitForOpenCV();
    } catch (e) {
      console.warn("OpenCV timeout, returning original");
      return resolve(dataUrl);
    }

    const img = new Image();
    img.onload = () => {
      try {
        const srcMat = cv.imread(img);
        const sw = srcMat.cols;
        const sh = srcMat.rows;

        // Convert normalized corners to pixel coordinates
        // corners is expected to be [TL, TR, BR, BL]
        const pts = corners.map(c => ({ x: c.x * sw, y: c.y * sh }));

        // Calculate max output dimensions to preserve quality
        const widthA = Math.hypot(pts[2].x - pts[3].x, pts[2].y - pts[3].y);
        const widthB = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const maxWidth = Math.max(Math.floor(widthA), Math.floor(widthB));

        const heightA = Math.hypot(pts[1].x - pts[2].x, pts[1].y - pts[2].y);
        const heightB = Math.hypot(pts[0].x - pts[3].x, pts[0].y - pts[3].y);
        const maxHeight = Math.max(Math.floor(heightA), Math.floor(heightB));

        // Safety check to prevent WebGL crash on 0px canvas
        if (maxWidth === 0 || maxHeight === 0) {
          srcMat.delete();
          return resolve(dataUrl);
        }

        // Define source and destination quad arrays
        const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
          pts[0].x, pts[0].y, // TL
          pts[1].x, pts[1].y, // TR
          pts[2].x, pts[2].y, // BR
          pts[3].x, pts[3].y  // BL
        ]);

        const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0, 0,                             // TL
          maxWidth - 1, 0,                  // TR
          maxWidth - 1, maxHeight - 1,      // BR
          0, maxHeight - 1                  // BL
        ]);

        // Calculate homography matrix natively
        const M = cv.getPerspectiveTransform(srcCoords, dstCoords);
        const dstMat = new cv.Mat();
        
        // Apply transform
        cv.warpPerspective(srcMat, dstMat, M, new cv.Size(maxWidth, maxHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

        // Extract to browser canvas format
        const canvas = document.createElement('canvas');
        cv.imshow(canvas, dstMat);
        const warpedUrl = canvas.toDataURL('image/jpeg', 0.95);

        // Crucial memory cleanup
        srcMat.delete(); dstMat.delete(); srcCoords.delete(); dstCoords.delete(); M.delete();

        resolve(warpedUrl);
      } catch (err) {
        console.error("OpenCV perspective transform failed:", err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for perspective transform'));
    img.src = dataUrl;
  });
}
