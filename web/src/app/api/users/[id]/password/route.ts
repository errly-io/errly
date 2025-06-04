import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { validateRequestBody, validatePathParams, ChangePasswordSchema, UserIdSchema } from '../../../../lib/validation/schemas';
import { sanitizeObject } from '../../../../lib/security/sanitize';
import { log } from '../../../../lib/logging/logger';
import { prismaUsersRepository } from '../../../../lib/repositories/prisma';
import { verifyPassword, hashPassword, validatePasswordStrength } from '../../../../lib/utils/password';

export async function POST(
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

    // Only allow users to change their own password
    if (paramValidation.data.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate and sanitize request body
    const bodyValidation = await validateRequestBody(request, ChangePasswordSchema);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: bodyValidation.error },
        { status: 400 }
      );
    }

    // Sanitize input data
    const sanitizedData = sanitizeObject(bodyValidation.data);
    const { currentPassword, newPassword } = sanitizedData;

    // Get user from database
    const user = await prismaUsersRepository.getById(paramValidation.data.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a password hash
    if (!user.password_hash) {
      return NextResponse.json(
        { error: 'User does not have a password set. Please use OAuth authentication.' },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: 'New password does not meet requirements',
          details: passwordValidation.errors
        },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password in database
    await prismaUsersRepository.updatePassword(paramValidation.data.id, newPasswordHash);

    log.auth.success('Password Change', { userId: paramValidation.data.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.api.error('POST /api/users/[id]/password', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
