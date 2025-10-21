# Tldraw Persistence with Store Model

This implementation provides save/load functionality for Tldraw canvases using the Prisma Store model.

## Features

- **Auto-load on mount**: When you navigate to `/setup/[roomid]`, it automatically loads the last saved snapshot for that room
- **Manual Save**: Click the "Save" button to persist the current canvas state
- **Manual Load**: Click the "Load" button to reload the last saved state
- **Visual feedback**: The Save button shows success/error states

## Architecture

### API Routes (`/api/store/[roomId]`)

- **GET**: Loads the most recent snapshot for a room
- **POST**: Saves a new snapshot for a room

### Component (`TldrawWithPersistence`)

A wrapper around Tldraw that:
1. Fetches the initial snapshot on mount
2. Provides Save/Load buttons with the editor context
3. Handles all snapshot serialization/deserialization

### Page (`/setup/[roomid]`)

Dynamically loads the TldrawWithPersistence component with SSR disabled to avoid React context issues.

## Usage

### Navigate to a room:
```
/setup/1
/setup/test-room
/setup/abc123
```

The roomId can be any string that corresponds to a valid Room.id in your database.

## Database Schema

Uses the existing `Store` model:
```prisma
model Store {
  id        Int    @id @default(autoincrement())
  roomId    Int
  storedata String
  room      Room   @relation(fields: [roomId], references: [id])
}
```

The `storedata` field contains the JSON-serialized Tldraw snapshot with both document and session state.

## API Examples

### Save a snapshot:
```typescript
const snapshot = getSnapshot(editor.store);

await fetch(`/api/store/${roomId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ snapshot }),
});
```

### Load a snapshot:
```typescript
const response = await fetch(`/api/store/${roomId}`);
const data = await response.json();

if (data.success && data.snapshot) {
  editor.setCurrentTool('select');
  loadSnapshot(editor.store, data.snapshot);
}
```

## Notes

- Each save creates a new Store entry (doesn't update existing)
- The GET endpoint retrieves the most recent entry by `id DESC`
- Snapshots include both document state (shapes, assets) and session state (camera, selected IDs)
- The component automatically handles SSR issues by using dynamic imports with `ssr: false`

## Future Enhancements

- Auto-save on interval or on change
- Version history/snapshots list
- Delete old snapshots to save space
- Collaborative real-time sync (combine with WebSocket)
