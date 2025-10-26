"use client"
import { Tldraw } from 'tldraw';
import { useSession } from 'next-auth/react';
import 'tldraw/tldraw.css';
import ConnectionUI from './Connectionui';
import { useTldrawStore } from '../hooks/useTldrawStore';
import { useAuthToken } from '../hooks/useAuthToken';
import { useUserColor } from '../hooks/useUserColor';
import { useWebSocketConnection } from '../hooks/useWebSocketConnection';
import { usePresenceManager } from '../hooks/usePresenceManager';
import { useStoreBroadcaster } from '../hooks/useStoreBroadcaster';
import { useSaveSnapshot } from '../hooks/useSaveSnapshot';

interface TldrawMultiplayerProps {
  roomId: string;
}

export function TldrawMultiplayer({ roomId }: TldrawMultiplayerProps) {
  const { data: session } = useSession();
  
  // Custom hooks
  const storeWithStatus = useTldrawStore(roomId);
  const getToken = useAuthToken();
  const userColor = useUserColor();
  
  const { connectionStatus, wsRef } = useWebSocketConnection({
    roomId,
    storeWithStatus,
    session,
    getToken,
  });
  
  usePresenceManager({
    roomId,
    storeWithStatus,
    connectionStatus,
    session,
    wsRef,
    userColor,
  });
  
  useStoreBroadcaster({
    roomId,
    storeWithStatus,
    wsRef,
  });
  
  const { saveSnapshot, isSaving, saveStatus } = useSaveSnapshot(roomId, storeWithStatus);

  if (storeWithStatus.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading canvas...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Tldraw store={storeWithStatus}>
        <ConnectionUI 
          connectionStatus={connectionStatus}
          isSaving={isSaving}
          saveStatus={saveStatus}
          onSave={saveSnapshot}
        />
      </Tldraw>
    </div>
  );
}

