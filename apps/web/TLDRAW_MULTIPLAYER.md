# Tldraw Multiplayer with WebSocket

This implementation provides real-time collaborative drawing using WebSocket and database persistence.

## Features

- **Real-time Collaboration**: Multiple users can draw simultaneously and see each other's changes in real-time
- **Auto-load on Mount**: Loads the last saved state when joining a room
- **Manual Save**: Click the "Save" button to persist the current canvas state to the database
- **Connection Status**: Visual indicator showing connection state (Live/Connecting/Disconnected)
- **JWT Authentication**: Secure WebSocket connections using JWT tokens

## Architecture

### Components

#### `TldrawMultiplayer` Component
- Main component that renders Tldraw with multiplayer capabilities
- Loads initial snapshot from database on mount
- Manages WebSocket connection and synchronization

#### `MultiplayerSync` Component
- Handles WebSocket connection with JWT authentication
- Listens to local editor changes and broadcasts to other users
- Receives remote changes and applies them to the local editor
- Provides connection status indicator and save button

### API Routes

#### `/api/auth/token` (POST)
- Generates a JWT token for WebSocket authentication
- Requires an active NextAuth session
- Returns a signed token valid for 7 days

#### `/api/store/[roomId]` (GET/POST)
- GET: Loads the most recent snapshot for a room
- POST: Saves a new snapshot for a room

### WebSocket Server (`apps/websocket/src/index.ts`)
- Runs on `ws://localhost:8080`
- Authenticates connections using JWT tokens
- Broadcasts shape changes to all connected clients in the same room
- Maintains user information for each connection

## How It Works

### 1. **Initial Load**
```
User opens /setup/[roomId]
  ↓
Component fetches saved snapshot from /api/store/[roomId]
  ↓
Tldraw renders with initial state
```

### 2. **WebSocket Connection**
```
Component requests JWT token from /api/auth/token
  ↓
Connects to ws://localhost:8080?token=[JWT]
  ↓
Server verifies token and establishes connection
  ↓
Connection status indicator shows "Live"
```

### 3. **Real-time Sync**
```
User draws on canvas
  ↓
editor.store.listen() detects change
  ↓
Broadcasts change via WebSocket: { type: 'shape', roomId, shape }
  ↓
Server receives and broadcasts to other clients in same room
  ↓
Other clients receive and apply changes to their editor
```

### 4. **Manual Save**
```
User clicks "Save" button
  ↓
Gets current snapshot via getSnapshot(editor.store)
  ↓
POSTs to /api/store/[roomId]
  ↓
Snapshot saved to database
  ↓
Button shows "✓ Saved!"
```

## Usage

### Start the Application

1. **Start WebSocket Server:**
```bash
cd apps/websocket
pnpm run dev
```

2. **Start Next.js App:**
```bash
cd apps/web
pnpm run dev
```

3. **Open Multiple Browsers:**
- Browser 1: `http://localhost:3000/setup/1`
- Browser 2: `http://localhost:3000/setup/1`
- Draw in one browser and see changes appear in the other!

## Features in Detail

### Connection Status Indicator
- **Green "Live"**: Connected and syncing
- **Yellow "Connecting..."**: Attempting to connect
- **Red "Disconnected"**: Connection lost (auto-reconnects after 3s)
- **Red "Error"**: Connection error

### Auto-reconnection
If the WebSocket connection drops, the component automatically attempts to reconnect every 3 seconds.

### Conflict Prevention
- Uses `isApplyingRemoteChanges` ref to prevent feedback loops
- Only broadcasts user-initiated changes (not remote changes being applied)

### Database Persistence
- Each save creates a new Store entry
- GET endpoint retrieves the most recent entry
- Snapshots include both document state (shapes) and session state (camera position)

## Technical Details

### WebSocket Message Format
```typescript
{
  type: 'shape',
  roomId: string,
  shape: TLRecord,  // Tldraw record (shape, page, asset, etc.)
  user: {
    id: string,
    name: string,
    email: string
  }
}
```

### JWT Token Payload
```typescript
{
  userId: string,
  email: string,
  name: string,
  iat: number,      // Issued at
  exp: number,      // Expires at
  iss: 'livegrams-app',
  aud: 'livegrams-users'
}
```

## Configuration

### Environment Variables
```env
# .env (apps/web)
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
DATABASE_URL=your-database-url
```

### WebSocket Server
Update `apps/websocket/src/index.ts` if you need to:
- Change the port (default: 8080)
- Modify JWT verification
- Add additional message types

## Troubleshooting

### "Invalid token" Error
- Ensure `NEXTAUTH_SECRET` matches between web app and WebSocket server
- Check that user is authenticated (signed in)
- Verify JWT token is being generated correctly

### Changes Not Syncing
- Check WebSocket connection status indicator
- Verify both users are in the same room (same roomId)
- Check browser console for errors
- Ensure WebSocket server is running

### Save Not Working
- Verify room exists in database
- Check network tab for API errors
- Ensure user has permission to save

## Future Enhancements

- **Presence indicators**: Show cursors of other users
- **User list**: Display who's currently in the room
- **Chat**: Built-in chat for collaborators
- **Version history**: Browse and restore previous versions
- **Permissions**: Role-based access control
- **Auto-save**: Periodic automatic saves
- **Optimistic updates**: Apply changes immediately before server confirmation
