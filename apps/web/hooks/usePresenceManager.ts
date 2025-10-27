import { useEffect, useRef } from 'react';
import { type TLStoreWithStatus, type TLInstancePresenceID, type TLStore } from 'tldraw';
import { createPresenceStateDerivation, type TLPresenceUserInfo } from '@tldraw/tlschema';
import { atom, type Signal } from '@tldraw/state';
import { type Session } from 'next-auth';

interface UsePresenceManagerProps {
  roomId: string;
  storeWithStatus: TLStoreWithStatus;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  session: Session | null;
  wsRef: React.RefObject<WebSocket | null>;
  userColor: (id: string) => string;
}

export function usePresenceManager({
  roomId,
  storeWithStatus,
  connectionStatus,
  session,
  wsRef,
  userColor,
}: UsePresenceManagerProps) {
  const userSignalRef = useRef<Signal<TLPresenceUserInfo> | null>(null);

  useEffect(() => {
    if (
      storeWithStatus.status === 'loading' ||
      !('store' in storeWithStatus) ||
      !storeWithStatus.store ||
      connectionStatus !== 'connected'
    ) {
      return;
    }

    const store = storeWithStatus.store as TLStore;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const userId = (session?.user as { id?: string })?.id || 'guest';
    const userName = session?.user?.name || 'Guest';
    const userColorValue = userColor(userId);
    
    if (!userSignalRef.current) {
      userSignalRef.current = atom<TLPresenceUserInfo>('presence-user', {
        id: userId,
        name: userName,
        color: userColorValue
      });
    } else {
      const currentAtom = userSignalRef.current as Signal<TLPresenceUserInfo> & { set?: (value: TLPresenceUserInfo) => void };
      if (currentAtom.set) {
        currentAtom.set({ id: userId, name: userName, color: userColorValue });
      }
    }
    
    const presenceId = `instance_presence:${userId}:${Math.random().toString(36).slice(2, 9)}` as TLInstancePresenceID;

    const presenceDerivation = createPresenceStateDerivation(userSignalRef.current, presenceId);
    const presenceSignal = presenceDerivation(store);

    let lastSerialized = '';
    const updatePresence = () => {
      try {
        const presence = presenceSignal?.get?.();
        if (!presence) return;
        const serialized = JSON.stringify(presence);
        if (serialized === lastSerialized) return;
        lastSerialized = serialized;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'record', roomId, record: presence }));
        }
      } catch (err) {
        console.warn('[Presence] Error updating:', err);
      }
    };

    let rafId: number | null = null;
    const scheduleUpdate = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        updatePresence();
        rafId = null;
      });
    };

    const unsubscribe = store.listen(scheduleUpdate, { scope: 'all', source: 'user' });

    updatePresence();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      unsubscribe();
    };
  }, [storeWithStatus, connectionStatus, session, roomId, userColor, wsRef]);

  return userSignalRef;
}
