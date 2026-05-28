/**
 * useOcr.js
 * Thin wrapper around Tesseract.js for in-browser OCR.
 */
import { useState, useRef, useCallback } from 'react';

export function useOcr() {
  const [ocrText, setOcrText]         = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrRunning, setOcrRunning]   = useState(false);
  const [ocrError, setOcrError]       = useState(null);
  const workerRef = useRef(null);

  const runOcr = useCallback(async (dataUrl, lang = 'eng') => {
    if (!dataUrl) return;
    setOcrRunning(true);
    setOcrProgress(0);
    setOcrError(null);
    setOcrText('');

    try {
      // Dynamic import so tesseract.js doesn't bloat initial bundle
      const Tesseract = (await import('tesseract.js')).default;

      // Terminate old worker if any
      if (workerRef.current) {
        try { await workerRef.current.terminate(); } catch (_) {}
      }

      const worker = await Tesseract.createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      workerRef.current = worker;

      const { data } = await worker.recognize(dataUrl);
      setOcrText(data.text || '');
      setOcrProgress(100);
    } catch (err) {
      setOcrError('OCR failed: ' + err.message);
    } finally {
      setOcrRunning(false);
    }
  }, []);

  const clearOcr = useCallback(() => {
    setOcrText('');
    setOcrProgress(0);
    setOcrError(null);
  }, []);

  return { ocrText, setOcrText, ocrProgress, ocrRunning, ocrError, runOcr, clearOcr };
}
