import { useEffect, useRef, useState } from 'react';
import { type TLStoreWithStatus, type TLStore } from 'tldraw';
import { type Session } from 'next-auth';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketConnectionProps {
  roomId: string;
  storeWithStatus: TLStoreWithStatus;
  session: Session | null;
  getToken: () => Promise<string | null>;
}

export function useWebSocketConnection({
  roomId,
  storeWithStatus,
  session,
  getToken,
}: UseWebSocketConnectionProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!session?.user || storeWithStatus.status === 'loading' || !('store' in storeWithStatus) || !storeWithStatus.store) {
      return;
    }

    const store = storeWithStatus.store as TLStore;
    let ws: WebSocket | null = null;

    const connectWebSocket = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setConnectionStatus('error');
          return;
        }
        
        const WS_URL = process.env.NEXT_PUBLIC_WS_URL
        ws = new WebSocket(`${WS_URL}?token=${token}`);
        wsRef.current = ws;
        
        ws.onopen = () => {
          setConnectionStatus('connected');
          ws?.send(JSON.stringify({ type: 'join', roomId }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.roomId !== roomId) return;
            
            if (data.record) {
              const collaborativeTypes = ['shape', 'draw', 'geo', 'text', 'image', 'instance_presence'];
              if (!collaborativeTypes.includes(data.record.typeName)) return;
              
              if (data.record.typeName === 'instance_presence') {
                const userId = (session?.user as { id?: string })?.id || 'guest';
                const recordId = data.record.id as string;
                if (recordId.startsWith(`instance_presence:${userId}:`)) {
                  return; 
                }
              }
              const existing = store.get(data.record.id);
              const isNew = !existing;
              const isUpdated = existing && JSON.stringify(existing) !== JSON.stringify(data.record);
              if (isNew || isUpdated) {
                store.mergeRemoteChanges(() => {
                  store.put([data.record]);
                });
              }
            } else if (data.type === 'record-removed' && Array.isArray(data.ids)) {
              store.mergeRemoteChanges(() => {
                store.remove(data.ids);});
            }
          } catch (error) {
            console.error('[Client] Error processing WebSocket message:', error);
          }
        };
        
        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
          setConnectionStatus('error');
        };
        
        ws.onclose = () => {
          setConnectionStatus('disconnected');
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              setConnectionStatus('connecting');
              connectWebSocket();
            }
          },3000);
        };
      } catch (error) {
                        // In Next.js, client-side env vars must be prefixed with NEXT_PUBLIC_
                        // Use NEXT_PUBLIC_WS_URL in the browser. If it's not set, fall back
                        // to the current origin converted to ws/wss.
                        const publicWs = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_WS_URL as string | undefined) : undefined;
                        const defaultOrigin = typeof window !== 'undefined'
                          ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
                          : 'ws://localhost:8080';

                        const WS_URL = publicWs ?? process.env.WS_URL ?? defaultOrigin;

                        // Debugging: log resolved WS URL and room id when connecting
                        // (helps when env var isn't picked up in client bundle)
                        // eslint-disable-next-line no-console
                        console.debug('[WS] connecting', { WS_URL, roomId });
        setConnectionStatus('error');
      }
    };

    setConnectionStatus('connecting');
    connectWebSocket();

    return () => {
      if (ws) ws.close();
    };
  }, [session, roomId, getToken, storeWithStatus]);

  return { connectionStatus, wsRef };
}
