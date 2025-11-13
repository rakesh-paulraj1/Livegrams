"use client"

import { useCallback, useState, useRef } from 'react'

// Simple cache to prevent duplicate requests
interface CacheEntry {
  message: string
  canvasSnapshot: string // stringified snapshot
  response: unknown
  timestamp: number
}

const CACHE_DURATION = 10000 // 10 seconds

export default function useChatApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<CacheEntry | null>(null)

  const sendMessage = useCallback(async (message: string, canvasSnapshot?: Array<{id: string, type: string, x?: number, y?: number, props?: Record<string, unknown>}>) => {
    // Check cache
    const snapshotKey = JSON.stringify(canvasSnapshot || [])
    const now = Date.now()
    
    if (cacheRef.current && 
        cacheRef.current.message === message &&
        cacheRef.current.canvasSnapshot === snapshotKey &&
        now - cacheRef.current.timestamp < CACHE_DURATION) {
      console.log('📦 Using cached response')
      return cacheRef.current.response
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, canvasSnapshot }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Network error')
      }
      const data = await res.json()
      
      // Cache the response
      cacheRef.current = {
        message,
        canvasSnapshot: snapshotKey,
        response: data,
        timestamp: now
      }
      
      return data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'Unknown error')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { sendMessage, loading, error }
}
