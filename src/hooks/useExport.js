/**
 * useExport.js
 * Handles PDF, JPEG, and TXT export from the in-memory pages array.
 */
import { useState, useCallback } from 'react';
import { buildPdf, downloadBytes } from '../utils/pdfBuilder';

export function useExport(pages) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  /** Export all pages as a multi-page PDF */
  const exportPdf = useCallback(async () => {
    if (!pages.length) return;
    setExporting(true);
    setExportError(null);
    try {
      const bytes = await buildPdf(pages, 'LCamScanner Document');
      downloadBytes(bytes, `LCamScanner_${datestamp()}.pdf`, 'application/pdf');
    } catch (err) {
      setExportError('PDF export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [pages]);

  /** Export each page as a separate JPEG download */
  const exportJpeg = useCallback(() => {
    pages.forEach((page, idx) => {
      if (!page.dataUrl) return;
      const a = document.createElement('a');
      a.href     = page.dataUrl;
      a.download = `LCamScanner_page${idx + 1}_${datestamp()}.jpg`;
      setTimeout(() => a.click(), idx * 120); // stagger to avoid browser blocking
    });
  }, [pages]);

  /** Export all OCR text as a TXT file */
  const exportTxt = useCallback(() => {
    const lines = pages.map((page, idx) => {
      const divider = `--- Page ${idx + 1} ---`;
      const text    = page.ocrText?.trim() || '[No OCR text for this page]';
      return `${divider}\n${text}`;
    });
    const content = lines.join('\n\n');
    const blob    = new Blob([content], { type: 'text/plain' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = `LCamScanner_text_${datestamp()}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [pages]);

  return { exportPdf, exportJpeg, exportTxt, exporting, exportError };
}

function datestamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
