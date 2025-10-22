"use client"
import { useEffect, useState } from 'react';
import { Tldraw, getSnapshot, useEditor, TLStoreSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';

interface TldrawWithPersistenceProps {
  roomId: string;
}

function SaveButton({ roomId }: { roomId: string }) {
  const editor = useEditor();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('idle');
      
      const snapshot = getSnapshot(editor.store);
      
      const response = await fetch(`/api/store/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        console.error('Failed to save:', data.message);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving snapshot:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={isSaving}
      className={`absolute top-11 left-1 z-[999] px-4 py-2 rounded-lg font-semibold transition-all ${
        saveStatus === 'success'
          ? 'bg-green-500 text-white'
          : saveStatus === 'error'
          ? 'bg-red-500 text-white'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
    >
      {isSaving ? 'Saving...': saveStatus === 'success' ? 'Saved' : saveStatus === 'error' ? 'Error' : ' Save'}
    </button>
  );
}

export function TldrawWithPersistence({ roomId }: TldrawWithPersistenceProps) {
  const [snapshot, setSnapshot] = useState<TLStoreSnapshot | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function loadInitialSnapshot() {
      try {
        const response = await fetch(`/api/store/${roomId}`);
        const data = await response.json();

        if (data.success && data.snapshot) {
          setSnapshot(data.snapshot);
        }
      } catch (error) {
        console.error('Error loading initial snapshot:', error);
      } finally {
        setIsInitializing(false);
      }
    }

    loadInitialSnapshot();
  }, [roomId]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading canvas...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Tldraw snapshot={snapshot ?? undefined}>
        <SaveButton roomId={roomId} />
      </Tldraw>
    </div>
  );
}
