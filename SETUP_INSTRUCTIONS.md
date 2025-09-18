# Excalidraw Clone API Setup Instructions

## Overview
I've created a complete Excalidraw clone API system with room management and canvas shape persistence. Here's what was implemented:

## Changes Made

### 1. Database Schema Updates
- Updated `packages/db/prisma/schema.prisma` with new models:
  - `Room` model with `Int` ID, `slug`, `adminId`, `createdAt`
  - `Shape` model for storing canvas shapes with `shapeData` (JSON)
  - Proper relationships between `User`, `Room`, and `Shape` models

### 2. API Implementation
- **Join Room API** (`/api/server/joinroom`) - Join existing rooms
- **Save Shape API** (`/api/server/saveshape`) - Persist canvas shapes
- **Get Shapes API** (`/api/server/getshapes`) - Retrieve all shapes for a room
- Updated `shapes/draw.ts` to work with new API structure

### 3. Dependencies
- Added `zod` to `apps/web/package.json` for schema validation
- Added database scripts to `packages/db/package.json`
- Added convenience scripts to root `package.json`

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

### 4. Alternative: Run Migration (if you prefer migrations)
```bash
pnpm db:migrate
```

## API Usage

### 1. Join Room API: `POST /api/server/joinroom`

**Request Body:**
```json
{
  "roomId": 123
}
```

**Success Response (200):**
```json
{
  "roomId": 123,
  "roomSlug": "room-slug",
  "admin": {
    "id": "admin-user-id",
    "name": "Admin Name",
    "email": "admin@example.com"
  },
  "message": "Successfully joined room"
}
```

### 2. Save Shape API: `POST /api/server/saveshape`

**Request Body:**
```json
{
  "roomId": 123,
  "shapeData": "{\"type\":\"rect\",\"x\":100,\"y\":100,\"width\":200,\"height\":150}"
}
```

**Success Response (200):**
```json
{
  "shapeId": 456,
  "roomId": 123,
  "shapeData": "{\"type\":\"rect\",\"x\":100,\"y\":100,\"width\":200,\"height\":150}",
  "user": {
    "id": "user-id",
    "name": "User Name",
    "email": "user@example.com"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "message": "Shape saved successfully"
}
```

### 3. Get Shapes API: `GET /api/server/getshapes?roomId=123`

**Success Response (200):**
```json
{
  "roomId": 123,
  "shapes": [
    {
      "id": 456,
      "shapeData": "{\"type\":\"rect\",\"x\":100,\"y\":100,\"width\":200,\"height\":150}",
      "user": {
        "id": "user-id",
        "name": "User Name",
        "email": "user@example.com"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Shapes retrieved successfully"
}
```

**Error Responses (All APIs):**
- `400`: Incorrect inputs (validation failed)
- `401`: Unauthorized (no userId in cookies)
- `404`: Room not found
- `500`: Internal server error
- `503`: Database not ready (run setup commands)

## Features

1. **Shape Persistence**: Canvas shapes are automatically saved to the database
2. **Real-time Collaboration**: WebSocket integration for live shape updates
3. **Room Management**: Join rooms and retrieve all existing shapes
4. **User Tracking**: Each shape is associated with the user who created it
5. **Input Validation**: Zod schema validation for all API endpoints
6. **Authentication**: Cookie-based user authentication
7. **Error Handling**: Comprehensive error handling with appropriate status codes
8. **Type Safety**: Full TypeScript support with proper typing

## Canvas Integration

The `shapes/draw.ts` file has been updated to:
- Work with integer room IDs instead of string UUIDs
- Automatically save shapes to the database when drawn
- Load existing shapes when joining a room
- Send real-time updates via WebSocket

## Shape Types Supported

- **Rectangle**: `{type: "rect", x, y, width, height}`
- **Circle**: `{type: "circle", centerX, centerY, radius}`
- **Pencil**: `{type: "pencil", startX, startY, endX, endY}`

## Next Steps

After running the setup commands, the Excalidraw clone will be ready to use. The linting errors you see are expected until the Prisma client is generated and dependencies are installed.
