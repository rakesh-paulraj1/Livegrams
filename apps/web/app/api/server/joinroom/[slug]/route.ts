import { NextRequest, NextResponse } from 'next/server';
import { prismaClient } from '@repo/db/client';
import { getServerSession } from 'next-auth';
import { authentication } from '../../../../../lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
 
  const session = await getServerSession(authentication);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: "Unauthorized: User not authenticated" },
      { status: 401 }
    );
  }

  
  


 
  try {

    const { slug } = params;
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      return NextResponse.json(
        { message: "Invalid or missing room slug" },
        { status: 400 }
      );
    }

    const existingRoom = await prismaClient.room.findUnique({
      where: { slug }
    });

    if (!existingRoom) {
      return NextResponse.json(
        { message: "Room with this slug does not exist" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      roomId: existingRoom.id
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: "Database error. Please try again later." },
      { status: 503 }
    );
  }
}