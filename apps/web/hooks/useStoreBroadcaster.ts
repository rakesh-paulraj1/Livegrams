import { useEffect } from 'react';
import { type TLStoreWithStatus, type TLRecord, type TLStore } from 'tldraw';

interface UseStoreBroadcasterProps {
  roomId: string;
  storeWithStatus: TLStoreWithStatus;
  wsRef: React.MutableRefObject<WebSocket | null>;
}

export function useStoreBroadcaster({ roomId, storeWithStatus, wsRef }: UseStoreBroadcasterProps) {
  useEffect(() => {
    if (storeWithStatus.status === 'loading' || !('store' in storeWithStatus) || !storeWithStatus.store) return;

    const store = storeWithStatus.store as TLStore;
    const handleStoreChange = (changes: { 
      changes: { 
        added: Record<string, TLRecord>; 
        updated: Record<string, [from: TLRecord, to: TLRecord]>; 
        removed: Record<string, TLRecord> 
      } 
    }) => {
      const ws = wsRef.current;
      if (ws?.readyState !== WebSocket.OPEN) return;
      
      // Exclude presence since it's handled separately in the presence effect
      const collaborativeTypes = ['shape', 'draw', 'geo', 'text', 'image'];
      const changedRecords: TLRecord[] = [
        ...Object.values(changes.changes.added),
        ...Object.values(changes.changes.updated).map((u) => u[1])
      ].filter((record) => collaborativeTypes.includes(record.typeName));

      changedRecords.forEach((record) => {
        ws.send(JSON.stringify({ type: 'record', roomId, record }));
      });

      const removedRecords: TLRecord[] = Object.values(changes.changes.removed).filter((r) => {
        const t = (r as TLRecord).typeName as string;
        return t === 'shape' || t === 'draw' || t === 'geo' || t === 'text' || t === 'image';
      }) as TLRecord[];
      
      if (removedRecords.length > 0) {
        const ids = removedRecords.map((r) => r.id);
        ws.send(JSON.stringify({ type: 'record-removed', roomId, ids }));
      }
    };
    
    const unsubscribe = store.listen(handleStoreChange, { scope: 'all', source: 'user' });
    return () => unsubscribe();
  }, [roomId, storeWithStatus, wsRef]);
}
