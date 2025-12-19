"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toaster";
import { Camera, ImagePlus, X } from "lucide-react";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  onDetected: (value: string) => void;
  disabled?: boolean;
};

function getBarcodeDetectorCtor(): any {
  return (globalThis as any).BarcodeDetector;
}

export function BarcodeScanner({ value, onValueChange, onDetected, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const canScan =
      typeof window !== "undefined" && !!getBarcodeDetectorCtor() && !!navigator?.mediaDevices?.getUserMedia;
    setSupported(canScan);
  }, []);

  async function stop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    setScanning(false);
  }

  async function start() {
    if (!supported) {
      toast.error("Camera barcode scanning isn't supported in this browser.");
      return;
    }
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const BarcodeDetectorCtor = getBarcodeDetectorCtor();
      const detector = new BarcodeDetectorCtor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });

      const detectLoop = async () => {
        try {
          if (!videoRef.current) return;
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length) {
            const raw = barcodes[0].rawValue;
            if (raw) {
              onValueChange(raw);
              onDetected(raw);
              await stop();
              return;
            }
          }
        } catch {
          // ignore frame errors
        }
        rafRef.current = requestAnimationFrame(detectLoop);
      };

      rafRef.current = requestAnimationFrame(detectLoop);
    } catch {
      toast.error("Couldn't access camera. Check permissions and try again.");
      await stop();
    }
  }

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function scanFile(file: File) {
    const BarcodeDetectorCtor = getBarcodeDetectorCtor();
    if (!BarcodeDetectorCtor) {
      toast.error("Image barcode scanning isn't supported in this browser.");
      return;
    }
    try {
      const bmp = await createImageBitmap(file);
      const detector = new BarcodeDetectorCtor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
      const barcodes = await detector.detect(bmp);
      if (barcodes && barcodes.length) {
        const raw = barcodes[0].rawValue;
        if (raw) {
          onValueChange(raw);
          onDetected(raw);
          return;
        }
      }
      toast.error("No barcode found in that image.");
    } catch {
      toast.error("Image scan failed.");
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <Input placeholder="UPC/EAN" value={value} onChange={(e) => onValueChange(e.target.value)} disabled={disabled} />
        <Button onClick={() => onDetected(value)} disabled={disabled}>Lookup</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={scanning ? stop : start} disabled={disabled || !supported}>
          {scanning ? (
            <>
              <X className="mr-2 h-4 w-4" /> Stop camera
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" /> Scan with camera
            </>
          )}
        </Button>

        <label className={"inline-flex cursor-pointer items-center" + (disabled ? " pointer-events-none opacity-50" : "")}
          title="Upload a photo of a barcode">
          <span className="sr-only">Scan from photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) scanFile(f);
              e.currentTarget.value = "";
            }}
          />
          <span className="inline-flex h-10 items-center justify-center rounded-2xl bg-zinc-900/60 px-4 text-sm font-medium text-zinc-100 ring-1 ring-zinc-800 transition hover:bg-zinc-900">
            <ImagePlus className="mr-2 h-4 w-4" /> Scan photo
          </span>
        </label>
      </div>

      {scanning ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-zinc-800">
          <video ref={videoRef} className="aspect-video w-full bg-black" playsInline muted />
        </div>
      ) : null}

      {supported === null ? (
        <div className="text-xs text-zinc-500">Checking camera support…</div>
      ) : !supported ? (
        <div className="text-xs text-zinc-500">
          Camera scanning requires a Chromium-based browser (or BarcodeDetector support). Manual entry still works.
        </div>
      ) : (
        <div className="text-xs text-zinc-500">
          Tip: camera scanning works best on HTTPS or localhost.
        </div>
      )}
    </div>
  );
}
