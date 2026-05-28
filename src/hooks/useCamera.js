/**
 * useCamera.js
 * Manages MediaDevices camera lifecycle — stream, capture, device switching.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
  const videoRef        = useRef(null);
  const streamRef       = useRef(null);
  const [active, setActive]           = useState(false);
  const [error, setError]             = useState(null);
  const [facingMode, setFacingMode]   = useState('environment');
  const [devices, setDevices]         = useState([]);
  const [deviceId, setDeviceId]       = useState(null);
  const [torch, setTorch]             = useState(false);
  const [zoom, setZoom]               = useState(1);

  /* Enumerate cameras */
  const enumerateDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter(d => d.kind === 'videoinput');
      setDevices(cams);
    } catch (_) {}
  }, []);

  /* Start camera stream */
  const startCamera = useCallback(async (overrideFacing) => {
    stopCamera();
    setError(null);
    try {
      const facing = overrideFacing || facingMode;
      const constraints = {
        video: {
          facingMode: { ideal: facing },
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setActive(true);
      await enumerateDevices();
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError'  ? 'Camera permission denied. Please allow camera access.' :
        err.name === 'NotFoundError'    ? 'No camera found on this device.' :
        err.name === 'NotReadableError' ? 'Camera is in use by another app.' :
        'Failed to access camera: ' + err.message;
      setError(msg);
      setActive(false);
    }
  }, [facingMode, deviceId, enumerateDevices]);

  /* Stop stream */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  /* Flip front/back */
  const flipCamera = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  /* Toggle torch (flash) */
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const newVal = !torch;
      await track.applyConstraints({ advanced: [{ torch: newVal }] });
      setTorch(newVal);
    } catch (_) {}
  }, [torch]);

  /* Apply zoom */
  const applyZoom = useCallback(async (val) => {
    setZoom(val);
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: val }] });
    } catch (_) {}
  }, []);

  /* Capture a frame from the video → ImageData on a canvas */
  const captureFrame = useCallback((targetCanvas) => {
    const video = videoRef.current;
    if (!video || !active) return null;
    const w = video.videoWidth  || 1280;
    const h = video.videoHeight || 720;
    targetCanvas.width  = w;
    targetCanvas.height = h;
    const ctx = targetCanvas.getContext('2d');
    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -w, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, w, h);
    }
    return targetCanvas.toDataURL('image/jpeg', 0.92);
  }, [active, facingMode]);

  /* Cleanup on unmount */
  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    active,
    error,
    facingMode,
    devices,
    deviceId,
    setDeviceId,
    torch,
    zoom,
    startCamera,
    stopCamera,
    flipCamera,
    toggleTorch,
    applyZoom,
    captureFrame,
  };
}
