/**
 * CameraView.jsx
 * Live camera viewfinder with capture button, mode overlays, and controls.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera, FlipHorizontal, Zap, ZapOff, ZoomIn, ZoomOut,
  Upload, X, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { splitBookPage } from '../../utils/scanModes/bookSplit';
import { stitchIdCard }  from '../../utils/scanModes/idCardStitch';
import { detectDocumentCorners } from '../../utils/math/edgeDetection';
import { applyPerspectiveTransform } from '../../utils/math/perspectiveTransform';

export default function CameraView({
  cameraHook, scanMode, onCapture, onClose,
}) {
  const {
    videoRef, active, error, facingMode, torch,
    startCamera, stopCamera, flipCamera, toggleTorch, applyZoom, captureFrame,
  } = cameraHook;

  const captureCanvasRef = useRef(document.createElement('canvas'));
  const [zoomLevel, setZoomLevel]   = useState(1);
  const [flash, setFlash]           = useState(false);
  const [idStep, setIdStep]         = useState(0); // 0=front, 1=back
  const [idFront, setIdFront]       = useState(null);
  const [batchCount, setBatchCount] = useState(0);
  const [capturing, setCapturing]   = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  /* Zoom controls */
  const handleZoom = (delta) => {
    const next = Math.max(1, Math.min(4, zoomLevel + delta));
    setZoomLevel(next);
    applyZoom(next);
  };

  /* Trigger the flash effect */
  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
  };

  /* Main capture handler — branches by scan mode */
  const handleCapture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    triggerFlash();

    const dataUrl = captureFrame(captureCanvasRef.current);
    if (!dataUrl) { setCapturing(false); return; }

    try {
      if (scanMode === 'standard' || scanMode === 'batch' || scanMode === 'receipt') {
        const corners = await detectDocumentCorners(dataUrl);
        const warpedUrl = await applyPerspectiveTransform(dataUrl, corners);
        
        await onCapture([{
          dataUrl: warpedUrl,
          originalDataUrl: dataUrl,
          cropCorners: corners,
          filter: 'magicColor'
        }], { type: scanMode });

        if (scanMode === 'batch') {
          setBatchCount(c => c + 1);
          setCapturing(false);
          return; // camera stays open
        }

      } else if (scanMode === 'book') {
        // Split at centre → 2 pages
        const [left, right] = splitBookPage(captureCanvasRef.current);
        await onCapture([
          { dataUrl: left, originalDataUrl: left, filter: 'magicColor' },
          { dataUrl: right, originalDataUrl: right, filter: 'magicColor' }
        ], { type: 'book' });

      } else if (scanMode === 'idcard') {
        if (idStep === 0) {
          setIdFront(dataUrl);
          setIdStep(1); // wait for back
          setCapturing(false);
          return;
        } else {
          // Stitch front + back
          const stitched = await stitchIdCard(idFront, dataUrl);
          await onCapture([{ dataUrl: stitched, originalDataUrl: stitched, filter: 'magicColor' }], { type: 'idcard' });
          setIdStep(0);
          setIdFront(null);
        }
      }
    } catch (e) {
      console.error('Capture processing error', e);
    }

    setCapturing(false);
    // For non-batch modes, close camera after capture
    if (scanMode !== 'batch') onClose?.();
  }, [capturing, scanMode, idStep, idFront, captureFrame, onCapture, onClose]);

  /* Keyboard shortcut */
  useEffect(() => {
    const onKey = (e) => { if (e.code === 'Space') { e.preventDefault(); handleCapture(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCapture]);

  /* Aspect ratio guide for receipt/whiteboard */
  const showGuide = scanMode === 'receipt';
  const guideStyle = showGuide ? {
    position: 'absolute',
    top: '10%', left: '20%', right: '20%', bottom: '10%',
    border: '2px solid rgba(14,165,233,0.7)',
    borderRadius: 8,
    pointerEvents: 'none',
  } : null;

  return (
    <div className="flex flex-col h-full" style={{ background: '#000' }}>
      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Flash overlay */}
        {flash && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none"
               style={{ opacity: 0.85 }} />
        )}

        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="w-full h-full object-cover"
          style={{ 
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            opacity: capturing ? 0.4 : 1,
            transition: 'opacity 0.2s'
          }}
        />

        {/* Processing overlay */}
        {capturing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40">
            <div className="px-4 py-2 rounded-full glass" style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
              Processing...
            </div>
          </div>
        )}

        {/* Corner frame markers */}
        {active && !error && (
          <>
            <div className="camera-frame-corner corner-tl" />
            <div className="camera-frame-corner corner-tr" />
            <div className="camera-frame-corner corner-bl" />
            <div className="camera-frame-corner corner-br" />
            <div className="scan-line" />
          </>
        )}

        {/* Receipt / Whiteboard guide box */}
        {showGuide && <div style={guideStyle} />}

        {/* ID Card step indicator */}
        {scanMode === 'idcard' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-semibold"
               style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--clr-brand-400)', border: '1px solid var(--clr-brand-500)' }}>
            {idStep === 0 ? '📸 Capture FRONT of ID' : '📸 Capture BACK of ID'}
          </div>
        )}

        {/* Book scan centre guide */}
        {scanMode === 'book' && (
          <div className="absolute inset-y-0" style={{
            left: '50%', width: 2,
            background: 'rgba(14,165,233,0.5)',
            transform: 'translateX(-50%)',
          }}>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded whitespace-nowrap"
                 style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--clr-brand-400)' }}>
              Split Here
            </div>
          </div>
        )}

        {/* Batch counter */}
        {scanMode === 'batch' && batchCount > 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
               style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid var(--clr-brand-400)' }}>
            <CheckCircle size={14} style={{ color: 'var(--clr-success)' }} />
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{batchCount} captured</span>
          </div>
        )}

        {/* Zoom level indicator */}
        {zoomLevel > 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs"
               style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
            {zoomLevel.toFixed(1)}×
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6"
               style={{ background: 'rgba(0,0,0,0.85)' }}>
            <AlertTriangle size={36} style={{ color: 'var(--clr-warning)' }} />
            <p className="text-center text-sm" style={{ color: 'var(--clr-text-secondary)' }}>{error}</p>
            <button className="btn btn-primary btn-sm" onClick={() => startCamera()}>
              Retry Camera
            </button>
          </div>
        )}

        {/* Top controls bar */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button className="btn btn-ghost btn-icon tooltip" data-tip="Close"
                  onClick={onClose}
                  style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <X size={16} style={{ color: '#fff' }} />
          </button>
          <button className="btn btn-ghost btn-icon tooltip" data-tip="Flip camera"
                  onClick={flipCamera}
                  style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <FlipHorizontal size={16} style={{ color: '#fff' }} />
          </button>
          <button className="btn btn-ghost btn-icon tooltip" data-tip={torch ? 'Torch off' : 'Torch on'}
                  onClick={toggleTorch}
                  style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
            {torch
              ? <Zap size={16} style={{ color: 'var(--clr-warning)' }} />
              : <ZapOff size={16} style={{ color: '#888' }} />
            }
          </button>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-20 right-3 flex flex-col gap-2">
          <button className="btn btn-ghost btn-icon"
                  onClick={() => handleZoom(0.5)}
                  style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <ZoomIn size={15} style={{ color: '#fff' }} />
          </button>
          <button className="btn btn-ghost btn-icon"
                  onClick={() => handleZoom(-0.5)}
                  style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <ZoomOut size={15} style={{ color: '#fff' }} />
          </button>
        </div>
      </div>

      {/* Bottom capture bar */}
      <div className="flex items-center justify-center gap-6 py-5"
           style={{ background: 'rgba(0,0,0,0.9)', flexShrink: 0 }}>

        {/* Upload from gallery */}
        <label className="btn btn-ghost btn-icon tooltip" data-tip="Upload image"
               style={{ cursor: 'pointer' }}>
          <Upload size={18} style={{ color: 'var(--clr-text-secondary)' }} />
          <input type="file" accept="image/*" className="hidden"
                 onChange={async (e) => {
                   const file = e.target.files?.[0];
                   if (!file) return;
                   const reader = new FileReader();
                   reader.onload = async (ev) => {
                     await onCapture([ev.target.result], { type: scanMode });
                     if (scanMode !== 'batch') onClose?.();
                   };
                   reader.readAsDataURL(file);
                   e.target.value = '';
                 }} />
        </label>

        {/* Main shutter button */}
        <button
          onClick={handleCapture}
          disabled={!active || capturing}
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, var(--clr-brand-500), var(--clr-brand-600))',
            border: '4px solid rgba(255,255,255,0.25)',
            boxShadow: '0 0 24px rgba(14,165,233,0.5)',
            transition: 'all 0.15s ease',
          }}
        >
          <Camera size={28} style={{ color: '#fff' }} />
          {capturing && (
            <div className="absolute inset-0 rounded-full"
                 style={{ border: '3px solid var(--clr-brand-400)', animation: 'pulse-ring 0.8s ease infinite' }} />
          )}
        </button>

        {/* Done button for batch mode */}
        {scanMode === 'batch' && batchCount > 0 && (
          <button className="btn btn-accent btn-sm" onClick={onClose}>
            Done ({batchCount})
          </button>
        )}
        {(scanMode !== 'batch' || batchCount === 0) && (
          <div style={{ width: 42 }} />
        )}
      </div>
    </div>
  );
}
