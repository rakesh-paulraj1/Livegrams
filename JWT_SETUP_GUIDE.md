# JWT Authentication Setup Guide

## Overview
I've implemented a comprehensive JWT authentication system for your Excalidraw clone with secure WebSocket connections and API authentication.

## What's Been Implemented

### 1. JWT Dependencies
- ✅ Added `jsonwebtoken` and `@types/jsonwebtoken` to `apps/web/package.json`
- ✅ JWT utilities in `apps/web/lib/jwt.ts`

### 2. Authentication Flow
- ✅ **Session-based JWT signing**: JWT tokens are created and signed during NextAuth session
- ✅ **Cookie storage**: JWT tokens stored in secure HTTP-only cookies
- ✅ **LocalStorage backup**: Tokens also stored in localStorage for client-side access
- ✅ **Token expiration**: 7-day token lifetime with proper issuer/audience validation

### 3. WebSocket Security
- ✅ **JWT verification**: WebSocket server verifies JWT tokens before allowing connections
- ✅ **User identification**: Each WebSocket connection is tied to a verified user
- ✅ **Room-based broadcasting**: Messages are broadcast to all users in the same room
- ✅ **Connection logging**: Detailed logging of WebSocket connections and disconnections

### 4. API Security
- ✅ **JWT authentication**: All API routes now use JWT token verification
- ✅ **Token extraction**: Automatic token extraction from cookies
- ✅ **User context**: API routes have access to full user information from JWT

## Environment Variables Required

Add these to your `.env` file:

```bash
# JWT Secret (use a strong, random secret in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Existing NextAuth variables
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Setup Instructions

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Generate Prisma Client
```bash
pnpm db:generate
```

### 3. Push Database Changes
```bash
pnpm db:push
```

### 4. Start the WebSocket Server
```bash
cd apps/websocket
pnpm dev
```

### 5. Start the Web Application
```bash
cd apps/web
pnpm dev
```

## JWT Token Structure

```typescript
interface JWTPayload {
  userId: string;    // User's unique ID
  email: string;     // User's email
  name: string;      // User's name
  iat: number;       // Issued at timestamp
  exp: number;       // Expiration timestamp
}
```

## Security Features

### 1. Token Signing
- **Issuer**: `livegrams-app`
- **Audience**: `livegrams-users`
- **Expiration**: 7 days
- **Algorithm**: HMAC SHA-256

### 2. WebSocket Authentication
```typescript
// WebSocket connection with JWT
const wsUrl = `ws://localhost:8080?token=${jwtToken}&roomId=${roomId}`;
```

### 3. API Authentication
All API routes now require valid JWT tokens:
- `POST /api/server/joinroom`
- `POST /api/server/saveshape`
- `GET /api/server/getshapes`

## Usage Examples

### 1. Frontend WebSocket Connection
```typescript
import { createAuthenticatedWebSocket } from '../utils/websocket';

const socket = createAuthenticatedWebSocket(roomId);
if (socket) {
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Handle real-time shape updates
  };
}
```

### 2. API Calls with Authentication
```typescript
// JWT token is automatically included in cookies
const response = await fetch('/api/server/joinroom', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ roomId: 123 })
});
```

### 3. WebSocket Message Broadcasting
```typescript
// Send shape updates to all users in the room
socket.send(JSON.stringify({
  type: 'shape',
  shape: shapeData,
  roomId: roomId
}));
```

## Security Benefits

1. **Token-based Authentication**: No need to store session state on the server
2. **Stateless API**: Each request is self-contained with user information
3. **Secure WebSocket**: Only authenticated users can connect to WebSocket
4. **User Tracking**: Every action is tied to a verified user
5. **Token Expiration**: Automatic token refresh through NextAuth
6. **Audit Trail**: All WebSocket connections and API calls are logged

## Error Handling

### JWT Token Errors
- **Invalid Token**: `401 Unauthorized - Invalid or expired token`
- **Missing Token**: `401 Unauthorized - Invalid or expired token`
- **Expired Token**: Automatic redirect to login (handled by NextAuth)

### WebSocket Errors
- **Invalid Token**: Connection immediately closed
- **Connection Errors**: Detailed logging for debugging

## Production Considerations

1. **JWT Secret**: Use a strong, random secret (32+ characters)
2. **HTTPS**: Always use HTTPS in production
3. **Token Refresh**: Implement token refresh mechanism
4. **Rate Limiting**: Add rate limiting to prevent abuse
5. **Monitoring**: Monitor JWT token usage and WebSocket connections

## Testing the Implementation

1. **Login**: Use Google OAuth to authenticate
2. **Check Tokens**: Verify JWT tokens are created and stored
3. **WebSocket**: Connect to WebSocket with valid token
4. **API Calls**: Test API endpoints with authentication
5. **Real-time**: Test shape sharing between multiple users

The system is now fully secured with JWT authentication! 🔐✨




