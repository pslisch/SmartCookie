import { prisma } from '../../../shared/db/prisma';
import { emailPasswordAuthProvider } from './auth.service';

export type SetupStep = 'superuser' | 'company' | 'complete';

export class SetupWizardService {
  /**
   * Returns which step is needed next, inferred from database row state:
   * - no superuser row → step "superuser"
   * - superuser exists but Company.setupCompletedAt is null → step "company"
   * - both present → "complete"
   */
  async getStatus(): Promise<SetupStep> {
    const superuser = await prisma.user.findFirst({
      where: { isSuperuser: true },
    });
    if (!superuser) {
      return 'superuser';
    }

    const completedCompany = await prisma.company.findFirst({
      where: {
        setupCompletedAt: {
          not: null,
        },
      },
    });
    if (!completedCompany) {
      return 'company';
    }

    return 'complete';
  }

  /**
   * Creates the single superuser. Enforces the DB-level unique isSuperuser constraint
   * and reserves that exact username (case-insensitive) against ever being used by a normal user.
   */
  async createSuperuser(username: string, password: string, recoveryEmail: string) {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      throw new Error('Username is required.');
    }
    if (!recoveryEmail || !recoveryEmail.trim()) {
      throw new Error('Recovery email is required.');
    }

    // Enforce case-insensitive username uniqueness explicitly
    const existingUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: normalizedUsername,
        },
      },
    });
    if (existingUser) {
      throw new Error('Username is already taken.');
    }

    // Enforce DB-level unique isSuperuser constraint by checking beforehand
    const existingSuperuser = await prisma.user.findFirst({
      where: { isSuperuser: true },
    });
    if (existingSuperuser) {
      throw new Error('A superuser already exists.');
    }

    // Hashes password and validates strong password policy via the auth provider
    const passwordHash = await emailPasswordAuthProvider.hashPassword(password);

    return await prisma.user.create({
      data: {
        username: normalizedUsername,
        passwordHash,
        isSuperuser: true,
        recoveryEmail: recoveryEmail.trim(),
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Creates the company, sets setupCompletedAt = now(), and links the superuser to it.
   * This is the permanent completion flag. Once set, further calls are rejected.
   */
  async completeCompanyStep(name: string, contactInfo: string) {
    const trimmedName = name.trim();
    const trimmedContact = contactInfo.trim();

    if (!trimmedName) {
      throw new Error('Company name is required.');
    }
    if (!trimmedContact) {
      throw new Error('Contact info is required.');
    }

    const status = await this.getStatus();
    if (status === 'complete') {
      throw new Error('Setup is already complete.');
    }
    if (status === 'superuser') {
      throw new Error('Superuser must be created before completing the company step.');
    }

    // Find the superuser to link
    const superuser = await prisma.user.findFirst({
      where: { isSuperuser: true },
    });
    if (!superuser) {
      throw new Error('Superuser must be created before completing the company step.');
    }

    // Create the company with setupCompletedAt set to now
    const company = await prisma.company.create({
      data: {
        name: trimmedName,
        contactInfo: trimmedContact,
        setupCompletedAt: new Date(),
      },
    });

    // Link the superuser to the new company
    await prisma.user.update({
      where: { id: superuser.id },
      data: { companyId: company.id },
    });

    return company;
  }
}

export const setupWizardService = new SetupWizardService();
