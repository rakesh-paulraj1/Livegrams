import { NextResponse } from 'next/server';
import { prismaClient } from '@repo/db/client';
import { getServerSession } from 'next-auth';
import { authentication } from '../../../../../lib/auth';
 

export async function POST(req: Request,  { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authentication)

  try {
    const { slug } = await params

    if (!slug || slug.trim().length === 0) {
      return NextResponse.json(
        { message: "Slug is required" },
        { status: 400 }
      );
    }


    try {
      const existingRoom = await prismaClient.room.findUnique({
        where: { slug: slug.trim() }
      });

      if (existingRoom) {
        return NextResponse.json(
          { message: "Room with this name alredy exixts" },
          { status: 409 }
        );
      }

      const newRoom = await prismaClient.room.create({
        data: {
          slug: slug.trim(),
          adminId:session.userId,
        }
      });

      return NextResponse.json({
        success: true,
        roomId: newRoom.id,
        slug: newRoom.slug,
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { message: "Database error. Please try again later." },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}