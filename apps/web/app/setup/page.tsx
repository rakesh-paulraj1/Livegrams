"use client"
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Dynamically import TldrawWithPersistence to avoid SSR issues
const TldrawWithPersistence = dynamic(
  () => import('../../../components/TldrawWithPersistence').then(m => ({ default: m.TldrawWithPersistence })),
  { ssr: false }
)

export default function SetupTldrawPage() {
  // For testing purposes, using a default roomId
  // In production, this should come from route params
  const roomId = "1"; 
  
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
        <TldrawWithPersistence roomId={roomId} />
      </Suspense>
    </div>
  )
}