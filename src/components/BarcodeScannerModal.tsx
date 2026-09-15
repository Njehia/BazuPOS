import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Volume2, AlertCircle, Keyboard } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onScan,
  onClose,
  title = 'Scan Product Barcode',
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'bazu-barcode-scanner-viewport';

  // Audio beep feedback using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 tone
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio not permitted or supported, silent fallback
    }
  };

  const handleDetectedBarcode = (decodedText: string) => {
    const cleanText = decodedText.trim();
    if (cleanText) {
      playBeep();
      stopScanner().then(() => {
        onScan(cleanText);
        onClose();
      });
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error clearing barcode scanner:', err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  };

  const startScannerWithCamera = async (cameraId?: string) => {
    setScannerError(null);
    setIsInitializing(true);
    await stopScanner();

    try {
      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.333,
      };

      const cameraParam = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraParam,
        config,
        (decodedText) => {
          handleDetectedBarcode(decodedText);
        },
        undefined
      );
      setIsInitializing(false);
    } catch (err: any) {
      console.warn('Barcode scanner camera start error:', err);
      setScannerError(
        err?.message ||
          'Camera access not available. Please allow camera permissions or enter the barcode using a USB scanner / keyboard below.'
      );
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back / environment camera if labeled
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          const defaultCamId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(defaultCamId);
          startScannerWithCamera(defaultCamId);
        } else {
          startScannerWithCamera();
        }
      })
      .catch(() => {
        if (!isMounted) return;
        startScannerWithCamera();
      });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">Scan 1D barcode or QR code with camera</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Viewport Area */}
        <div className="relative bg-black min-h-[260px] flex items-center justify-center overflow-hidden">
          <div id={readerElementId} className="w-full h-full" />

          {isInitializing && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
              <p className="text-xs text-slate-300 font-medium">Initializing camera & barcode reader...</p>
            </div>
          )}

          {scannerError && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-xs text-rose-300 font-semibold">{scannerError}</p>
              <button
                type="button"
                onClick={() => startScannerWithCamera(selectedCameraId)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Camera Selector (if multiple cameras detected) */}
        {cameras.length > 1 && (
          <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Camera:</span>
            <select
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                startScannerWithCamera(e.target.value);
              }}
              className="bg-slate-800 text-white rounded-lg px-2 py-1 text-xs border border-slate-700 focus:outline-none focus:border-amber-500"
            >
              {cameras.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Hardware Scanner / Manual Entry Fallback */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Keyboard className="w-3.5 h-3.5 text-amber-400" />
              Or scan with USB Gun / Type code:
            </span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> Audio Beep Enabled
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) {
                handleDetectedBarcode(manualCode.trim());
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="e.g. 6161100010023"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Apply
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
