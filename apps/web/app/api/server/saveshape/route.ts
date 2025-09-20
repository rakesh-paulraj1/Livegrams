import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaClient } from '@repo/db/client';
import { getCookie } from '../../../../utils/setcookie';
import { verifyToken, getTokenFromCookies } from '../../../../lib/jwt';

// Validation schema for save shape request
const SaveShapeSchema = z.object({
  roomId: z.number().int().positive("Room ID must be a positive integer"),
  shapeData: z.string().min(1, "Shape data is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsedData = SaveShapeSchema.safeParse(body);
    
    if (!parsedData.success) {
      return NextResponse.json(
        { message: "Incorrect inputs", errors: parsedData.error.errors },
        { status: 400 }
      );
    }

    // Extract and verify JWT token
    const token = getTokenFromCookies(req.headers.get('cookie'));
    const userInfo = verifyToken(token);
    
    if (!userInfo) {
      return NextResponse.json(
        { message: "Unauthorized - Invalid or expired token" },
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

      // Save the shape
      const shape = await prismaClient.shape.create({
        data: {
          roomId: parsedData.data.roomId,
          shapeData: parsedData.data.shapeData,
          userId: userInfo.userId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Return the saved shape
      return NextResponse.json({
        shapeId: shape.id,
        roomId: shape.roomId,
        shapeData: shape.shapeData,
        user: shape.user,
        createdAt: shape.createdAt,
        message: "Shape saved successfully"
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { message: "Database not ready. Please run: pnpm db:generate && pnpm db:push" },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Error saving shape:', error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
