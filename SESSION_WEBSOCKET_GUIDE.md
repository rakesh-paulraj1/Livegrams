# Session-Based WebSocket Authentication Guide

## Overview
I've updated the authentication system to use NextAuth session objects instead of localStorage for JWT token management. This provides better security and integration with NextAuth.

## What's Been Updated

### 1. Session Object Enhancement
- ✅ **JWT Token in Session**: `session.accessToken` now contains the JWT token
- ✅ **User ID in Session**: `session.userId` contains the user ID
- ✅ **No localStorage**: Removed localStorage dependency for better security

### 2. WebSocket Integration
- ✅ **Session-based Connection**: WebSocket uses session token directly
- ✅ **React Hook**: `useWebSocket` hook for easy integration
- ✅ **Type Safety**: Full TypeScript support with session types

## Updated Authentication Flow

### 1. Session Callback (auth.ts)
```typescript
session: async ({ session, token }: any) => {
  // ... user creation logic ...
  
  // Create JWT token
  const jwtToken = signToken({
    userId: userId,
    email: session.user.email,
    name: session.user.name
  });
  
  // Add to session object
  session.accessToken = jwtToken;
  session.userId = userId;
  
  return session;
}
```

### 2. WebSocket Connection
```typescript
// Using the session directly
const { data: session } = useSession();
const ws = new WebSocket(
  `ws://localhost:8080?token=${session?.accessToken}`
);
```

## Usage Examples

### 1. Basic WebSocket with Session
```typescript
import { useSession } from 'next-auth/react';

function MyComponent() {
  const { data: session } = useSession();
  
  useEffect(() => {
    if (session?.accessToken) {
      const ws = new WebSocket(
        `ws://localhost:8080?token=${session.accessToken}`
      );
      
      ws.onopen = () => console.log('Connected with session token');
      return () => ws.close();
    }
  }, [session]);
}
```

### 2. Using the Custom Hook
```typescript
import { useWebSocket } from '../hooks/useWebSocket';

function CanvasComponent({ roomId }: { roomId: number }) {
  const { socket, isConnected, isAuthenticated } = useWebSocket(roomId);
  
  useEffect(() => {
    if (socket && isAuthenticated) {
      // Initialize your canvas with the authenticated socket
      initDraw(canvasRef.current, roomId, socket);
    }
  }, [socket, roomId, isAuthenticated]);
  
  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <canvas ref={canvasRef} />
    </div>
  );
}
```

### 3. Complete Canvas Component
```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useWebSocket } from '../hooks/useWebSocket';
import { initDraw } from '../shapes/draw';

export default function CanvasWithWebSocket({ roomId }: { roomId: number }) {
  const { data: session } = useSession();
  const { socket, isConnected, isAuthenticated } = useWebSocket(roomId);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && socket && isAuthenticated) {
      initDraw(canvasRef.current, roomId, socket);
    }
  }, [socket, roomId, isAuthenticated]);

  if (!isAuthenticated) {
    return <div>Please log in to access the canvas</div>;
  }

  return (
    <div>
      <div className="status-bar">
        <p>User: {session?.user?.name}</p>
        <p>WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</p>
      </div>
      <canvas ref={canvasRef} width={800} height={600} />
    </div>
  );
}
```

## Key Benefits

### 1. **Security Improvements**
- ✅ **No localStorage**: Tokens not stored in browser storage
- ✅ **Session-based**: Tokens managed by NextAuth
- ✅ **Automatic Refresh**: Tokens refresh with session updates
- ✅ **Server-side Validation**: All tokens verified server-side

### 2. **Developer Experience**
- ✅ **Type Safety**: Full TypeScript support
- ✅ **React Integration**: Custom hooks for easy usage
- ✅ **Session Management**: Automatic session handling
- ✅ **Error Handling**: Built-in error handling and loading states

### 3. **Performance**
- ✅ **No Client-side Storage**: Faster initialization
- ✅ **Session Caching**: NextAuth handles session caching
- ✅ **Automatic Cleanup**: WebSocket connections cleaned up properly

## Session Object Structure

```typescript
interface Session {
  user: {
    id: string;
    name: string;
    email: string;
  };
  accessToken: string;  // JWT token for WebSocket
  userId: string;       // User ID for API calls
}
```

## WebSocket Hook API

```typescript
const {
  socket,           // WebSocket instance or null
  isConnected,      // boolean - connection status
  isAuthenticated,  // boolean - authentication status
  isLoading        // boolean - loading state
} = useWebSocket(roomId);
```

## Error Handling

### 1. Authentication Errors
```typescript
if (!isAuthenticated) {
  return <div>Please log in to access the canvas</div>;
}
```

### 2. Connection Errors
```typescript
if (!isConnected) {
  return <div>WebSocket connection failed. Please try again.</div>;
}
```

### 3. Loading States
```typescript
if (isLoading) {
  return <div>Loading authentication...</div>;
}
```

## Migration from localStorage

### Before (localStorage approach):
```typescript
const token = localStorage.getItem('jwt-token');
const ws = new WebSocket(`ws://localhost:8080?token=${token}`);
```

### After (session approach):
```typescript
const { data: session } = useSession();
const ws = new WebSocket(`ws://localhost:8080?token=${session?.accessToken}`);
```

## Best Practices

1. **Always Check Session**: Verify session exists before using token
2. **Handle Loading States**: Show loading indicators during authentication
3. **Error Boundaries**: Wrap components in error boundaries
4. **Cleanup**: Always cleanup WebSocket connections
5. **Type Safety**: Use TypeScript for session and WebSocket types

## Complete Example

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useWebSocket } from '../hooks/useWebSocket';

export default function CollaborativeCanvas({ roomId }: { roomId: number }) {
  const { data: session, status } = useSession();
  const { socket, isConnected, isAuthenticated } = useWebSocket(roomId);

  if (status === 'loading') return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;
  if (!isConnected) return <div>Connecting to server...</div>;

  return (
    <div>
      <h1>Collaborative Canvas</h1>
      <p>Welcome, {session?.user?.name}!</p>
      <p>Room: {roomId}</p>
      <p>Status: Connected</p>
      {/* Your canvas component here */}
    </div>
  );
}
```

The system now uses NextAuth sessions exclusively for WebSocket authentication, providing better security and integration! 🔐✨




