/**
 * idCardStitch.js
 * Stitches a front + back ID card image onto a single A4 canvas side-by-side.
 * A4 at 96dpi ≈ 794 × 1123 px.
 * Returns a dataURL of the stitched image.
 */

const A4_W = 794;
const A4_H = 1123;
const PADDING = 32;
const GAP = 24;

export function stitchIdCard(frontDataUrl, backDataUrl) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width  = A4_W;
    canvas.height = A4_H;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, A4_W, A4_H);

    const cardW = (A4_W - PADDING * 2 - GAP) / 2;
    const cardH = cardW * 0.63; // standard card aspect ratio

    const frontImg = new Image();
    const backImg  = new Image();
    let loaded = 0;

    const onLoad = () => {
      loaded++;
      if (loaded < 2) return;

      const yOffset = (A4_H - cardH) / 2;

      // Draw front
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur  = 16;
      roundRect(ctx, PADDING, yOffset, cardW, cardH, 10);
      ctx.clip();
      ctx.drawImage(frontImg, PADDING, yOffset, cardW, cardH);
      ctx.restore();

      // Draw back
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur  = 16;
      roundRect(ctx, PADDING + cardW + GAP, yOffset, cardW, cardH, 10);
      ctx.clip();
      ctx.drawImage(backImg, PADDING + cardW + GAP, yOffset, cardW, cardH);
      ctx.restore();

      // Labels
      ctx.fillStyle = '#334155';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FRONT', PADDING + cardW / 2, yOffset + cardH + 20);
      ctx.fillText('BACK',  PADDING + cardW + GAP + cardW / 2, yOffset + cardH + 20);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };

    frontImg.onload = onLoad;
    backImg.onload  = onLoad;
    frontImg.src = frontDataUrl;
    backImg.src  = backDataUrl;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
