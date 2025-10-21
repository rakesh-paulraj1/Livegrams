"use client"
import { useEffect, useState } from 'react';
import { Tldraw, getSnapshot, loadSnapshot, useEditor, TLStoreSnapshot } from 'tldraw';
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
      className={`absolute top-4 right-4 z-50 px-4 py-2 rounded-lg font-semibold transition-all ${
        saveStatus === 'success'
          ? 'bg-green-500 text-white'
          : saveStatus === 'error'
          ? 'bg-red-500 text-white'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save'}
    </button>
  );
}

function LoadButton({ roomId }: { roomId: string }) {
  const editor = useEditor();
  const [isLoading, setIsLoading] = useState(false);

  const handleLoad = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/store/${roomId}`);
      const data = await response.json();

      if (data.success && data.snapshot) {
        editor.setCurrentTool('select'); // Reset tool state
        loadSnapshot(editor.store, data.snapshot);
      } else {
        console.log('No snapshot found or failed to load:', data.message);
      }
    } catch (error) {
      console.error('Error loading snapshot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLoad}
      disabled={isLoading}
      className="absolute top-4 right-28 z-50 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Loading...' : 'Load'}
    </button>
  );
}

function TldrawWithButtons({ roomId }: { roomId: string }) {
  return (
    <>
      <Tldraw />
      <SaveButton roomId={roomId} />
      <LoadButton roomId={roomId} />
    </>
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
        <TldrawWithButtons roomId={roomId} />
      </Tldraw>
    </div>
  );
}
