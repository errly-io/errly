import { NextRequest, NextResponse } from 'next/server';
import { prismaUsersRepository, prismaSpacesRepository } from '../../../lib/repositories/prisma';
import { hashPassword, validatePasswordStrength } from '../../../lib/utils/password';
import { z } from 'zod';

const RegisterSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
  spaceName: z.string()
    .min(2, 'Space name must be at least 2 characters')
    .max(100, 'Space name must be less than 100 characters')
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = RegisterSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { name, email, password, spaceName } = validation.data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Password does not meet requirements',
          details: passwordValidation.errors.map(error => ({
            field: 'password',
            message: error
          }))
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prismaUsersRepository.getByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create space for the user (if spaceName provided) or use default
    const finalSpaceName = spaceName ?? `${name}'s Space`;
    const spaceSlug = finalSpaceName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Check if space slug already exists
    let uniqueSlug = spaceSlug;
    let counter = 1;
    while (true) {
      try {
        const existingSpace = await prismaSpacesRepository.getBySlug(uniqueSlug);
        if (!existingSpace) break;
        uniqueSlug = `${spaceSlug}-${counter}`;
        counter++;
      } catch {
        break;
      }
    }

    // Create space
    const space = await prismaSpacesRepository.create({
      name: finalSpaceName,
      slug: uniqueSlug,
      description: `Personal space for ${name}`,
    });

    // Create user
    const user = await prismaUsersRepository.create({
      email,
      name,
      password_hash: passwordHash,
      space_id: space.id,
      role: 'admin', // User is admin of their own space
    });

    // Return success (don't include sensitive data)
    return NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          space: {
            id: space.id,
            name: space.name,
            slug: space.slug,
          },
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
