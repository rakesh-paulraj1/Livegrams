"use client"

import { useCallback, useState } from 'react'

export default function useChatApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (message: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Network error')
      }
      const data = await res.json()
      // Return the full response so callers can use shapes and reply
      return data as any
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
