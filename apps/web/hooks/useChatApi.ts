"use client"

import { useCallback, useState, useRef } from 'react'

interface CacheEntry {
  message: string
  canvasSnapshot: string
  response: unknown
  timestamp: number
}

const CACHE_DURATION = 10000 

export default function useChatApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<CacheEntry | null>(null)

  const sendMessage = useCallback(async (
    message: string, 
    canvasImage: string,
    canvasSnapshot?: Array<{id: string, type: string, x?: number, y?: number, props?: Record<string, unknown>}>,
   
  ) => {
    const snapshotKey = JSON.stringify(canvasSnapshot || [])
    const now = Date.now()
    
    if (cacheRef.current && 
        cacheRef.current.message === message &&
        cacheRef.current.canvasSnapshot === snapshotKey &&
        now - cacheRef.current.timestamp < CACHE_DURATION) {
      console.log('Using cached response')
      return cacheRef.current.response
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, canvasImage }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Network error')
      }
      const data = await res.json()
      
      // Transform /api/draw response to match expected format
      const transformedData = {
        success: data.success,
        reply: data.reply || '',
        // Convert tldrawShapes to execution format for CanvasAssistant
        execution: data.success ? {
          ok: true,
          action: 'create',
          shapes: data.tldrawShapes || []
        } : {
          ok: false,
          error: data.error || 'Failed to generate shapes'
        },
        stats: data.stats,
        primitives: data.primitives
      }
      
      cacheRef.current = {
        message,
        canvasSnapshot: snapshotKey,
        response: transformedData,
        timestamp: now
      }
      
      return transformedData
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
