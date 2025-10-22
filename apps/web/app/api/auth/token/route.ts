import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authentication } from '../../../../lib/auth';
import { signToken } from '../../../../lib/jwt';

export async function POST() {
  try {
    const session = await getServerSession(authentication);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate JWT token for WebSocket authentication
    const token = signToken({
      userId: session.user.id,
      email: session.user.email || '',
      name: session.user.name || '',
    });

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
