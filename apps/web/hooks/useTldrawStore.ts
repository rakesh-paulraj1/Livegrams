import { useEffect, useState } from 'react';
import { createTLStore, loadSnapshot, type TLStoreSnapshot, type TLStoreWithStatus } from 'tldraw';

export function useTldrawStore(roomId: string) {
  const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function initStore() {
      try {
        const response = await fetch(`/api/store/${roomId}`);
        const data = await response.json();
        const newStore = createTLStore();
        const hasRemote = !!(data?.success && data?.snapshot);
        
        if (hasRemote) {
          try {
            // Helpful debug info when snapshots fail to load in the wild.
            console.debug('[Store] Fetched snapshot keys:', Object.keys(data.snapshot || {}), 'schemaVersion:', data.snapshot?.schema?.schemaVersion ?? data.snapshot?.schema?.schemaVersion);
            loadSnapshot(newStore, data.snapshot as TLStoreSnapshot);
          } catch (e) {
            console.error('[Store] Failed to load snapshot, starting with empty store:', e);
          }
        }

        if (!cancelled) {
          if (hasRemote) {
            setStoreWithStatus({ store: newStore, status: 'synced-remote', connectionStatus: 'online' });
          } else {
            setStoreWithStatus({ store: newStore, status: 'not-synced' });
          }
        }
      } catch (error) {
        console.error('[Store] Error fetching snapshot, starting with empty store:', error);
        const newStore = createTLStore();
        if (!cancelled) {
          setStoreWithStatus({ store: newStore, status: 'not-synced' });
        }
      }
    }

    setStoreWithStatus({ status: 'loading' });
    initStore();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  return storeWithStatus;
}
