import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaClient } from '@repo/db/client';


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

    try {
        await prismaClient.shape.create({
        data: {
          roomId: parsedData.data.roomId,
          shapeData: parsedData.data.shapeData,
        }
      });
      
      return NextResponse.json({
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
