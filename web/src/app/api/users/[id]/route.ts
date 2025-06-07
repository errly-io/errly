import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { validateRequestBody, validatePathParams, UpdateUserSchema, UserIdSchema } from '@/lib/validation/schemas';
import { sanitizeObject } from '@/lib/security/sanitize';
import { log } from '@/lib/logging/logger';

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

    // Validate path parameters
    const paramValidation = validatePathParams(resolvedParams, UserIdSchema);
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: paramValidation.error },
        { status: 400 }
      );
    }

    // Fetch user from database
    const user = await prisma.users.findUnique({
      where: { id: paramValidation.data.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
        role: true,
        created_at: true,
        updated_at: true,
        settings: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Only allow users to access their own data
    if (user.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    log.api.error('GET /api/users/[id]', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Only allow users to update their own data
    if (paramValidation.data.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate request body
    const bodyValidation = await validateRequestBody(request, UpdateUserSchema);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: bodyValidation.error },
        { status: 400 }
      );
    }

    // Sanitize input data
    const sanitizedData = sanitizeObject(bodyValidation.data);

    // Update user in database
    const updatedUser = await prisma.users.update({
      where: { id: paramValidation.data.id },
      data: {
        name: sanitizedData.name,
        ...(sanitizedData.avatar !== undefined && { avatar_url: sanitizedData.avatar }),
        ...(sanitizedData.preferences !== undefined && { settings: sanitizedData.preferences }),
        updated_at: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
        role: true,
        created_at: true,
        updated_at: true,
        settings: true
      }
    });

    log.info('User updated successfully', { userId: paramValidation.data.id });
    return NextResponse.json(updatedUser);
  } catch (error) {
    log.api.error('PATCH /api/users/[id]', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
