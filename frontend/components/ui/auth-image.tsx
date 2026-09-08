'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

/**
 * Renders an <img> for a backend endpoint that requires JWT auth (e.g.
 * /products/:id/image). Plain <img src="..."> can't send an Authorization
 * header, so this fetches the image via the authenticated axios instance and
 * renders it as a local blob URL instead.
 */
export function AuthImage({
  src,
  alt,
  className,
  fallback,
}: {
  src?: string | null
  alt: string
  className?: string
  fallback?: React.ReactNode
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    setBlobUrl(null)
    if (!src) return

    let objectUrl: string | null = null
    let cancelled = false

    api.get(src, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return
        if (!res.data) { setFailed(true); return }
        objectUrl = URL.createObjectURL(res.data)
        setBlobUrl(objectUrl)
      })
      .catch(() => { if (!cancelled) setFailed(true) })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (!src || failed || !blobUrl) return <>{fallback ?? null}</>

  return <img src={blobUrl} alt={alt} className={className} />
}
