import { prisma } from '../../../shared/db/prisma';
import { TokenService } from '../../../shared/token/token.service';
import { emailService } from '../../../shared/email/email.service';
import { TokenPurpose, UserStatus } from '@prisma/client';
import { INVITATION_TTL_SECONDS } from '../../../shared/constants';

export class UserInvitationService {
  /**
   * Invites a new user by email.
   * - Look up existing user by email.
   * - Not found -> create User (status PENDING, email set, username null, passwordHash "", recoveryEmail "", companyId from the existing company).
   * - Found, status ACTIVE -> throw a clear "user already active" error.
   * - Found, status PENDING -> throw a clear "already invited, use resend" error.
   */
  async invite(email: string): Promise<{ userId: string; token: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email is required.');
    }

    // Look up existing user by email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.status === UserStatus.ACTIVE) {
        throw new Error('user already active');
      }
      if (existingUser.status === UserStatus.PENDING) {
        throw new Error('already invited, use resend');
      }
      throw new Error(`User with email already exists with status: ${existingUser.status}`);
    }

    // Get the existing company
    const company = await prisma.company.findFirst();
    if (!company) {
      throw new Error('No company exists in the system yet. Please complete the setup wizard first.');
    }

    // Create User in PENDING status
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: null,
        companyId: company.id,
        status: UserStatus.PENDING,
      },
    });

    // Issue INVITATION token
    const token = await TokenService.issue(newUser.id, TokenPurpose.INVITATION, INVITATION_TTL_SECONDS);

    // Send invitation email
    await emailService.send(normalizedEmail, 'invitation', {
      email: normalizedEmail,
      token,
    });

    return { userId: newUser.id, token };
  }

  /**
   * Resends an invitation to an already pending user.
   * - Requires status PENDING.
   * - Re-issues a token (which automatically invalidates the old one).
   * - Resends the email.
   */
  async resendInvitation(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    if (user.status !== UserStatus.PENDING) {
      throw new Error('User is not in PENDING status.');
    }

    if (!user.email) {
      throw new Error('User does not have an email address.');
    }

    // Issue new INVITATION token
    const token = await TokenService.issue(user.id, TokenPurpose.INVITATION, INVITATION_TTL_SECONDS);

    // Resend email
    await emailService.send(user.email, 'invitation', {
      email: user.email,
      token,
    });

    return token;
  }
}

export const userInvitationService = new UserInvitationService();
