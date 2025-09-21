import { NextRequest, NextResponse } from 'next/server';
import { prismaClient } from "@repo/db/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params;
    
    const messages = await prismaClient.shape.findMany({
      where: {
        roomId: Number(roomId),
      },
      orderBy: {
        id: "desc",
      },
      take: 1000
    });

    const shapes = messages.map((shape) => {
      try {
        const shapeData = JSON.parse(shape.shapeData);
        return shapeData;
      } catch (error) {
        return null;
      }
    }).filter((shape): shape is NonNullable<typeof shape> => shape !== null);

    return NextResponse.json(shapes);
  } catch (error) {
    console.error('Error fetching shapes:', error);
    return NextResponse.json({ error: 'Failed to fetch shapes' }, { status: 500 });
  }
}
