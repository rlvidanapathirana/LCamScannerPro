/**
 * pdfBuilder.js
 * Compiles an array of image dataURLs into a multi-page PDF using pdf-lib.
 * Each page is sized to A4 in portrait, with the image scaled to fit.
 */
import { PDFDocument } from 'pdf-lib';

const A4_PT_W = 595.28;  // A4 width in points
const A4_PT_H = 841.89;  // A4 height in points

/**
 * @param {Array<{dataUrl: string, ocrText?: string}>} pages
 * @param {string} title
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function buildPdf(pages, title = 'Scanned Document') {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(title);
  pdfDoc.setAuthor('LCamScanner');
  pdfDoc.setCreationDate(new Date());

  for (const page of pages) {
    if (!page.dataUrl) continue;

    // Decode image type
    const isJpeg = page.dataUrl.startsWith('data:image/jpeg');
    const isPng  = page.dataUrl.startsWith('data:image/png');

    const base64 = page.dataUrl.split(',')[1];
    const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    let img;
    if (isJpeg) {
      img = await pdfDoc.embedJpg(bytes);
    } else if (isPng) {
      img = await pdfDoc.embedPng(bytes);
    } else {
      // Convert to jpeg via canvas
      const converted = await convertToJpeg(page.dataUrl);
      const b64 = converted.split(',')[1];
      const b   = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      img = await pdfDoc.embedJpg(b);
    }

    // Scale image to fit A4, preserving aspect ratio
    const { width: iw, height: ih } = img;
    const scaleW = A4_PT_W / iw;
    const scaleH = A4_PT_H / ih;
    const scale  = Math.min(scaleW, scaleH, 1); // never upscale
    const dw = iw * scale;
    const dh = ih * scale;
    const x  = (A4_PT_W - dw) / 2;
    const y  = (A4_PT_H - dh) / 2;

    const pdfPage = pdfDoc.addPage([A4_PT_W, A4_PT_H]);
    pdfPage.drawImage(img, { x, y, width: dw, height: dh });
  }

  return pdfDoc.save();
}

/** Convert any dataURL to JPEG via OffscreenCanvas or regular canvas */
function convertToJpeg(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width  = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve(c.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Trigger download of bytes as a file */
export function downloadBytes(bytes, filename, mimeType) {
  const blob = new Blob([bytes], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
