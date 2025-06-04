import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Only allow users to access their own sessions
    if (resolvedParams.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch user sessions from database
    // Note: This assumes you have a user_sessions table
    // For now, return empty array as the table structure needs to be defined
    // TODO: Implement proper user sessions table
    const sessions: any[] = [];

    // Example of what the query would look like when table exists:
    // const sessions = await prisma.userSession.findMany({
    //   where: { userId: resolvedParams.id },
    //   orderBy: { lastActiveAt: 'desc' },
    //   select: {
    //     id: true,
    //     deviceInfo: true,
    //     ipAddress: true,
    //     location: true,
    //     createdAt: true,
    //     lastActiveAt: true,
    //     isCurrent: true
    //   }
    // });

    return NextResponse.json({
      sessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
