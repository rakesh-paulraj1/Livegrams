import { useCallback, useState } from 'react';
import { type TLStoreWithStatus, type TLRecord, type TLStoreSnapshot } from 'tldraw';

export function useSaveSnapshot(roomId: string, storeWithStatus: TLStoreWithStatus) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const saveSnapshot = useCallback(async () => {
    if (storeWithStatus.status === 'loading' || !('store' in storeWithStatus) || !storeWithStatus.store) return;
    
    try {
      setIsSaving(true);
      setSaveStatus('idle');
      
      const allRecords = storeWithStatus.store.allRecords();
  
      const schema = typeof storeWithStatus.store.schema?.serialize === 'function'
        ? storeWithStatus.store.schema.serialize()
        : undefined;

      const snapshot: Partial<TLStoreSnapshot> = {
        store: Object.fromEntries(allRecords.map((record: TLRecord) => [record.id, record])),
      };

      if (schema) snapshot.schema = schema;

          
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
  }, [roomId, storeWithStatus]);

  return { saveSnapshot, isSaving, saveStatus };
}
