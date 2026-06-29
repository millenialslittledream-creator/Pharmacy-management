"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let controls: { stop: () => void } | undefined;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
        if (result) {
          onScan(result.getText());
          controls?.stop();
          onOpenChange(false);
        }
        // NotFoundException fires continuously while no barcode is in frame — not a real error.
        if (err && err.name !== "NotFoundException") {
          setError(err.message);
        }
      })
      .then((c) => {
        controls = c;
      })
      .catch((err) => setError(err.message ?? "Could not access camera"));

    return () => {
      controls?.stop();
    };
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan barcode</DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <video ref={videoRef} className="w-full rounded-md" muted />
        )}
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
