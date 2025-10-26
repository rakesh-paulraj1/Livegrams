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
      <div className="absolute top-1 inset-x-0 z-[999] flex items-center justify-center gap-2">
        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg ${
          connectionStatus === 'connected' 
            ? 'bg-green-500 text-white' 
            : connectionStatus === 'connecting'
            ? 'bg-yellow-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          <span className="inline-block w-2 h-2 rounded-full bg-white mr-2"></span>
          {connectionStatus === 'connected' && 'Live'}
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'disconnected' && 'Disconnected'}
          {connectionStatus === 'error' && 'Error'}
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className={`absolute top-11 left-4 z-[999] px-4 py-2 rounded-lg font-semibold transition-all ${
          saveStatus === 'success'
            ? 'bg-green-500 text-white'
            : saveStatus === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
      >
        {isSaving ? 'Saving...' : saveStatus === 'success' ? '✓ Saved!' : saveStatus === 'error' ? '✗ Error' : '💾 Save'}
      </button>
    </>
  );
}
