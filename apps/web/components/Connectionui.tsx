import React from 'react'

export default function ConnectionUI({ 
  connectionStatus, 
  isSaving, 
  saveStatus, 
  onSave,
  roomId,
}: { 
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  isSaving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  onSave: () => void;
  roomId?: string;
}) {
  const [copied, setCopied] = React.useState(false)
  const copyTimeoutRef = React.useRef<number | null>(null)

  const handleShare = async () => {
    if (!roomId) return
    try {
      const slugToCopy = String(roomId)
      await navigator.clipboard.writeText(slugToCopy)
      setCopied(true)
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current)
    }
  }, [])
  return (
    <>
      <div className="absolute top-1 inset-x-0 z-[300] flex items-center justify-center gap-2 pointer-events-none">
        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg bg-gray-200 pointer-events-auto ${
          connectionStatus === 'connected' 
            ? 'text-green-600' 
            : connectionStatus === 'connecting'
            ? 'text-yellow-600'
            : 'text-red-600'
        }`}>
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
            connectionStatus === 'connected' 
              ? 'bg-green-600' 
              : connectionStatus === 'connecting'
              ? 'bg-yellow-600'
              : 'bg-red-600'
          }`}></span>
          {connectionStatus === 'connected' && 'Live'}
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'disconnected' && 'Disconnected'}
          {connectionStatus === 'error' && 'Error'}
        </div>
      </div>

     
      {roomId && (
        <div className="absolute top-4 right-44 z-[300] flex items-center space-x-2">
          <button
            onClick={handleShare}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm shadow-lg hover:bg-gray-50"
            aria-label="Share room code"
          >
             Share
          </button>
          {copied && (
            <div className="text-sm text-green-600 font-medium">Slug copied!</div>
          )}
        </div>
      )}

      <button
        onClick={onSave}
        disabled={isSaving}
        className={`absolute top-12 left-38 z-[300] px-4 py-2 rounded-lg font-semibold transition-all ${
          saveStatus === 'success'
            ? 'bg-green-500 text-white'
            : saveStatus === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-gray-200 text-black hover:bg-gray-300'
        } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
      >
        {isSaving ? 'Saving...' : saveStatus === 'success' ? '✓ Saved!' : saveStatus === 'error' ? '✗ Error' : '💾 Save'}
      </button>
    </>
  );
}
