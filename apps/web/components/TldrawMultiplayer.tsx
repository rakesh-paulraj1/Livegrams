"use client"
import { Tldraw,TldrawOptions} from 'tldraw';
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

  

  const options: Partial<TldrawOptions> = {
  maxPages: 2,
  animationMediumMs: 5000,
}


  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Tldraw store={storeWithStatus} options={options} >
        <ConnectionUI 
          connectionStatus={connectionStatus}
          isSaving={isSaving}
          saveStatus={saveStatus}
          onSave={saveSnapshot}
          roomId={roomId}
        />
      </Tldraw>
    </div>
  );
}

