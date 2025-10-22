"use client"
import { useEffect, useState, useRef, useCallback } from 'react';
import { Tldraw, getSnapshot, useEditor, TLStoreSnapshot, TLRecord } from 'tldraw';
import { useSession } from 'next-auth/react';
import 'tldraw/tldraw.css';

interface TldrawMultiplayerProps {
  roomId: string;
}

function MultiplayerSync({ roomId }: { roomId: string }) {
  const editor = useEditor();
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const isApplyingRemoteChanges = useRef(false);

  // Get JWT token for WebSocket authentication
  const getToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const sessionData = await response.json();
      
      if (sessionData?.user) {
        // Generate JWT token - you might need an API endpoint for this
        const tokenResponse = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const { token } = await tokenResponse.json();
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }, []);

  // Save snapshot to database
  const saveSnapshot = async () => {
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

  // Initialize WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.error('No token available for WebSocket connection');
          setConnectionStatus('error');
          return;
        }

        ws = new WebSocket(`ws://localhost:8080?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          setConnectionStatus('connected');
          
          // Send initial join message
          ws?.send(JSON.stringify({
            type: 'join',
            roomId,
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.roomId === roomId && data.type === 'shape') {
              // Apply remote changes
              isApplyingRemoteChanges.current = true;
              
              if (data.shape) {
                // Update the store with the received shape
                editor.store.put([data.shape]);
              }
              
              isApplyingRemoteChanges.current = false;
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionStatus('error');
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setConnectionStatus('disconnected');
          
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              setConnectionStatus('connecting');
              connectWebSocket();
            }
          }, 3000);
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        setConnectionStatus('error');
      }
    };

    if (session?.user) {
      connectWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [session, roomId, getToken, editor]);

  // Listen to local changes and broadcast to other users
  useEffect(() => {
    const handleStoreChange = (changes: { changes: { added: Record<string, TLRecord>; updated: Record<string, [from: TLRecord, to: TLRecord]>; removed: Record<string, TLRecord> } }) => {
      // Don't broadcast if we're applying remote changes
      if (isApplyingRemoteChanges.current) return;
      
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        // Get the changed records
        const changedRecords: TLRecord[] = [
          ...Object.values(changes.changes.added),
          ...Object.values(changes.changes.updated).map((u) => u[1])
        ];

        // Broadcast each change
        changedRecords.forEach((record) => {
          ws.send(JSON.stringify({
            type: 'shape',
            roomId,
            shape: record,
          }));
        });
      }
    };

    const unsubscribe = editor.store.listen(handleStoreChange, {
      scope: 'document',
      source: 'user',
    });

    return () => {
      unsubscribe();
    };
  }, [editor, roomId]);

  return (
    <>
      {/* Connection Status Indicator */}
      <div className="absolute top-4 left-4 z-[999] flex items-center gap-2">
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

      {/* Save Button */}
      <button
        onClick={saveSnapshot}
        disabled={isSaving}
        className={`absolute top-4 right-4 z-[999] px-4 py-2 rounded-lg font-semibold transition-all ${
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

export function TldrawMultiplayer({ roomId }: TldrawMultiplayerProps) {
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
        <MultiplayerSync roomId={roomId} />
      </Tldraw>
    </div>
  );
}
