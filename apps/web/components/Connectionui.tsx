export default function ConnectionUI({ 
  connectionStatus, 
  isSaving, 
  saveStatus, 
  onSave 
}: { 
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  isSaving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  onSave: () => void;
}) {
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
