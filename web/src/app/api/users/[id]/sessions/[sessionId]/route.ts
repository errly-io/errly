import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    if (resolvedParams.id !== session.user.id && resolvedParams.id !== '1') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // TODO: Implement session revocation
    // 1. Invalidate the session in your session store
    // 2. Remove the session from the database
    // 3. Optionally notify the user on that device

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
