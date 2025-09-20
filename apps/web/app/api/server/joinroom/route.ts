import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaClient } from '@repo/db/client';
import { getCookie } from '../../../../utils/setcookie';
import { verifyToken, getTokenFromCookies } from '../../../../lib/jwt';

// Validation schema for join room request
const JoinRoomSchema = z.object({
  roomId: z.number().int().positive("Room ID must be a positive integer"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsedData = JoinRoomSchema.safeParse(body);
    
    if (!parsedData.success) {
      return NextResponse.json(
        { message: "Incorrect inputs" },
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
      // Check if room exists
      const room = await prismaClient.room.findUnique({
        where: {
          id: parsedData.data.roomId
        },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!room) {
        return NextResponse.json(
          { message: "Room not found" },
          { status: 404 }
        );
      }

      // Return room information for joining
      return NextResponse.json({
        roomId: room.id,
        roomSlug: room.slug,
        admin: room.admin,
        message: "Successfully joined room"
      });

    } catch (dbError) {
      // Handle case where room model might not be generated yet
      console.error('Database error:', dbError);
      return NextResponse.json(
        { message: "Database not ready. Please run: pnpm db:generate && pnpm db:push" },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
