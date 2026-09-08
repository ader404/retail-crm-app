'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface BarcodeScannerDialogProps {
  open: boolean
  onClose: () => void
  onDetected: (code: string) => void
}

const hints = new Map()
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODABAR,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
])

export function BarcodeScannerDialog({ open, onClose, onDetected }: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    const video = videoRef.current
    if (!video) return

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported in this browser.')
      return
    }
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      setError('Camera access requires HTTPS (or localhost).')
      return
    }

    const reader = new BrowserMultiFormatReader(hints)
    let stopped = false
    let controls: { stop: () => void } | null = null

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        video,
        (result, err) => {
          if (stopped) return
          if (result) {
            stopped = true
            controls?.stop()
            onDetectedRef.current(result.getText())
            return
          }
          if (err && !(err instanceof NotFoundException)) {
            // Non-fatal per-frame decode errors are expected while no barcode is in view.
          }
        },
      )
      .then((c) => { controls = c })
      .catch((err) => {
        if (stopped) return
        stopped = true
        if (err?.name === 'NotAllowedError') {
          setError('Camera access was blocked. Allow camera permission for this site and try again.')
        } else if (err?.name === 'NotFoundError') {
          setError('No camera was found on this device.')
        } else if (err?.name === 'NotReadableError') {
          setError('Camera is already in use by another app or tab.')
        } else {
          setError(err?.message || 'Could not start the camera.')
        }
      })

    return () => {
      stopped = true
      controls?.stop()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Scan Barcode</DialogTitle></DialogHeader>
        <div className="rounded-lg overflow-hidden bg-black min-h-[200px] flex items-center justify-center">
          {error ? (
            <p className="text-sm text-destructive text-center px-4 py-8">{error}</p>
          ) : (
            <video ref={videoRef} className="w-full aspect-video object-cover" muted playsInline />
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {error ? 'Fix the issue above, then close and reopen this dialog to retry.' : 'Point the camera at the product barcode'}
        </p>
      </DialogContent>
    </Dialog>
  )
}
