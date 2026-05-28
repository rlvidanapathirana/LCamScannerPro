/**
 * bookSplit.js
 * Splits a captured canvas image exactly at the vertical centre → 2 page images.
 * Returns [leftDataUrl, rightDataUrl].
 */
export function splitBookPage(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const half = Math.floor(w / 2);

  const leftCanvas  = document.createElement('canvas');
  const rightCanvas = document.createElement('canvas');
  leftCanvas.width  = rightCanvas.width  = half;
  leftCanvas.height = rightCanvas.height = h;

  const lCtx = leftCanvas.getContext('2d');
  const rCtx = rightCanvas.getContext('2d');

  lCtx.drawImage(sourceCanvas, 0,    0, half, h,  0, 0, half, h);
  rCtx.drawImage(sourceCanvas, half, 0, half, h,  0, 0, half, h);

  return [
    leftCanvas.toDataURL('image/jpeg', 0.92),
    rightCanvas.toDataURL('image/jpeg', 0.92),
  ];
}
