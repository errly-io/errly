import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { validateSearchParams, validatePathParams, PaginationSchema, UserIdSchema } from '@/lib/validation/schemas';

export async function GET(
  request: NextRequest,
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

    // Validate path parameters
    const paramValidation = validatePathParams(resolvedParams, UserIdSchema);
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: paramValidation.error },
        { status: 400 }
      );
    }

    // Only allow users to access their own activity
    if (paramValidation.data.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = validateSearchParams(searchParams, PaginationSchema);
    if (!queryValidation.success) {
      return NextResponse.json(
        { error: queryValidation.error },
        { status: 400 }
      );
    }

    // Fetch user activity from database
    // Note: This assumes you have an activity/audit log table
    // For now, return empty array as the table structure needs to be defined
    // TODO: Implement proper user activity tracking table
    const activities: unknown[] = [];

    // Example of what the query would look like when table exists:
    // const activities = await prisma.userActivity.findMany({
    //   where: { userId: paramValidation.data.id },
    //   orderBy: { createdAt: 'desc' },
    //   take: limit,
    //   select: {
    //     id: true,
    //     type: true,
    //     description: true,
    //     metadata: true,
    //     createdAt: true,
    //     ipAddress: true
    //   }
    // });

    return NextResponse.json({
      activities
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
