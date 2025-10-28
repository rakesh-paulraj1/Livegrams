import { NextRequest, NextResponse } from 'next/server';
import { prismaClient } from '@repo/db/client';


export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = parseInt((await params).roomId);

    if (isNaN(roomId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid room ID' },
        { status: 400 }
      );
    }

    // Find the most recent store entry for this room
    const store = await prismaClient.store.findFirst({
      where: { roomId },
      orderBy: { id: 'desc' },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, message: 'No snapshot found for this room' },
        { status: 404 }
      );
    }

    // Parse the stored JSON data
    const snapshot = JSON.parse(store.storedata);

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    console.error('Error loading snapshot:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load snapshot' },
      { status: 500 }
    );
  }
}

// POST - Save the Tldraw snapshot for a room
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = parseInt((await params).roomId);

    if (isNaN(roomId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid room ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { snapshot } = body;

    if (!snapshot) {
      return NextResponse.json(
        { success: false, message: 'Snapshot data is required' },
        { status: 400 }
      );
    }

    // Check if room exists
    const room = await prismaClient.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, message: 'Room not found' },
        { status: 404 }
      );
    }

    
    const store = await prismaClient.store.upsert({
      where: { roomId },
      update: { storedata: JSON.stringify(snapshot) },
      create: { roomId, storedata: JSON.stringify(snapshot) },
    });

    return NextResponse.json({
      success: true,
      message: 'Snapshot saved successfully',
      storeId: store.id,
    });
  } catch (error) {
    console.error('Error saving snapshot:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save snapshot' },
      { status: 500 }
    );
  }
}
