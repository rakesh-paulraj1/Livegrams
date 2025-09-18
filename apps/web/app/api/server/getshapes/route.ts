import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaClient } from '@repo/db/client';
import { getCookie } from '../../../../utils/setcookie';

// Validation schema for get shapes request
const GetShapesSchema = z.object({
  roomId: z.number().int().positive("Room ID must be a positive integer"),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = parseInt(searchParams.get('roomId') || '0');
    
    const parsedData = GetShapesSchema.safeParse({ roomId });
    
    if (!parsedData.success) {
      return NextResponse.json(
        { message: "Incorrect inputs", errors: parsedData.error.errors },
        { status: 400 }
      );
    }

    // Extract userId from cookies
    const userId = getCookie(req, 'userId');
    
    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    try {
      // Verify room exists
      const room = await prismaClient.room.findUnique({
        where: {
          id: parsedData.data.roomId
        }
      });

      if (!room) {
        return NextResponse.json(
          { message: "Room not found" },
          { status: 404 }
        );
      }

      // Get all shapes for the room
      const shapes = await prismaClient.shape.findMany({
        where: {
          roomId: parsedData.data.roomId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Return the shapes
      return NextResponse.json({
        roomId: parsedData.data.roomId,
        shapes: shapes.map(shape => ({
          id: shape.id,
          shapeData: shape.shapeData,
          user: shape.user,
          createdAt: shape.createdAt
        })),
        message: "Shapes retrieved successfully"
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { message: "Database not ready. Please run: pnpm db:generate && pnpm db:push" },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Error getting shapes:', error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
