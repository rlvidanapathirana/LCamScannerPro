/**
 * cvLoader.js
 * Robust initialization check for OpenCV.js loaded via CDN.
 */
export function waitForOpenCV() {
  return new Promise((resolve, reject) => {
    if (window.cv && typeof window.cv.Mat === 'function') {
      return resolve(window.cv);
    }
    
    // Check every 100ms if OpenCV has compiled the WASM and exposed Mat
    const checkInterval = setInterval(() => {
      if (window.cv && typeof window.cv.Mat === 'function') {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        resolve(window.cv);
      }
    }, 100);

    // Timeout after 15 seconds if it fails to load
    const timeoutId = setTimeout(() => {
      clearInterval(checkInterval);
      console.error("OpenCV initialization timed out.");
      reject(new Error("OpenCV initialization timed out"));
    }, 15000);
  });
}
