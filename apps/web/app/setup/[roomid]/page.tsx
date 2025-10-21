"use client"
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Dynamically import TldrawWithPersistence to avoid SSR issues
const TldrawWithPersistence = dynamic(
  () => import('../../../components/TldrawWithPersistence').then(m => ({ default: m.TldrawWithPersistence })),
  { ssr: false }
)

export default function SetupTldrawPage({ params }: { params: { roomid: string } }) {
  const roomid = params.roomid;
  
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Suspense fallback={<div className="flex items-center justify-center h-full">Loading canvas...</div>}>
        <TldrawWithPersistence roomId={roomid} />
      </Suspense>
    </div>
  )
}