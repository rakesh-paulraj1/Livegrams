"use client"
import { useEffect, useState, useRef, useCallback } from 'react';
import { Tldraw, getSnapshot, useEditor, TLStoreSnapshot, TLRecord } from 'tldraw';
import { createPresenceStateDerivation, type TLPresenceUserInfo, type TLInstancePresence } from '@tldraw/tlschema';
import { atom, type Signal } from '@tldraw/state';
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
  const lastPresenceSentRef = useRef<string>('');
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive a deterministic color from the user id
  const userColor = useCallback((id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 90%, 55%)`;
  }, []);

  // Create a user signal for presence derivation
  const userSignalRef = useRef<Signal<TLPresenceUserInfo> | null>(null);
  useEffect(() => {
    const uid = (session?.user as { id?: string } | undefined)?.id || 'guest';
    const name = session?.user?.name || 'Guest';
    const color = userColor(uid);
    userSignalRef.current = atom<TLPresenceUserInfo>('presence-user', { id: uid, name, color });
  }, [session, userColor]);

  const presenceStateRef = useRef<Signal<null | TLInstancePresence> | null>(null);
  
  const getToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const sessionData = await response.json();
      if (sessionData?.user) {
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
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
  ws = new WebSocket(`${WS_URL}?token=${token}`);
        wsRef.current = ws;
        ws.onopen = () => {
          console.log('WebSocket connected');
          setConnectionStatus('connected');
          
          ws?.send(JSON.stringify({
            type: 'join',
            roomId,
          }));

          // Start presence derivation and sending loop once connected
          if (userSignalRef.current) {
            presenceStateRef.current = createPresenceStateDerivation(userSignalRef.current)(editor.store);
            // Send immediately and then on interval when it changes
            const sendPresence = () => {
              const presence = presenceStateRef.current?.get?.();
              if (!presence) return;
              const serialized = JSON.stringify(presence);
              if (serialized !== lastPresenceSentRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
                lastPresenceSentRef.current = serialized;
                wsRef.current?.send(JSON.stringify({
                  type: 'presence',
                  roomId,
                  presence,
                }));
              }
            };
            // send once
            sendPresence();
            // then poll at a light interval
            presenceIntervalRef.current = setInterval(sendPresence, 150);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.roomId !== roomId) return;
            if (data.type === 'shape') {
              // Use mergeRemoteChanges to properly handle remote updates
              editor.store.mergeRemoteChanges(() => {
                if (data.shape) {
                  editor.store.put([data.shape]);
                }
              });
            } else if (data.type === 'presence') {
              // Apply collaborator presence updates
              if (data.presence) {
                editor.store.mergeRemoteChanges(() => {
                  editor.store.put([data.presence]);
                });
              }
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        }
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionStatus('error');
        };
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setConnectionStatus('disconnected');
          
          if (presenceIntervalRef.current) {
            clearInterval(presenceIntervalRef.current);
            presenceIntervalRef.current = null;
          }
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
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      if (ws) {
        ws.close();
      }
    };
  }, [session, roomId, getToken, editor]);

  
  useEffect(() => {
    const handleStoreChange = (changes: { changes: { added: Record<string, TLRecord>; updated: Record<string, [from: TLRecord, to: TLRecord]>; removed: Record<string, TLRecord> } }) => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        const changedRecords: TLRecord[] = [
          ...Object.values(changes.changes.added),
          ...Object.values(changes.changes.updated).map((u) => u[1])
        ];

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
      source: 'user',  // Only listen to user changes, not remote changes
    });

    return () => {
      unsubscribe();
    };
  }, [editor, roomId]);

  return (
    <>
      {/* Connection Status Indicator */}
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

      {/* Save Button */}
      <button
        onClick={saveSnapshot}
        disabled={isSaving}
        className={`absolute top-11  z-[999] px-4 py-2 rounded-lg font-semibold transition-all ${
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
