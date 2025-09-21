import { NextRequest, NextResponse } from 'next/server';
import { prismaClient } from '@repo/db/client';
import { getServerSession } from 'next-auth';
import { authentication } from '../../../../../lib/auth';
 

type Params = {
  params: {
    slug: string;
  };
};

export async function POST(req: NextRequest, { params }: Params) {
    const  session= await  getServerSession(authentication)

  try {
    const { slug } = await params;

    if (!slug || slug.trim().length === 0) {
      return NextResponse.json(
        { message: "Slug is required" },
        { status: 400 }
      );
    }


    try {
      // Check if room with this slug already exists
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