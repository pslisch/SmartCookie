import { prisma } from '../../../shared/db/prisma';
import { emailPasswordAuthProvider } from './auth.service';
import { seedSuperuserRoles } from '../../../../prisma/seed/rbacSeed';
import { roleTemplatesService } from '../../rbac/services/roleTemplates.service';

export type SetupStep = 'superuser' | 'superuser-mfa' | 'company' | 'mail-config' | 'identity-provider' | 'org-structure' | 'role-templates' | 'complete';

export class SetupWizardService {
  /**
   * Returns which step is needed next, inferred from database row state:
   * - no superuser row → step "superuser"
   * - superuser exists but MFA not enabled → step "superuser-mfa"
   * - superuser exists and MFA enabled but no company is linked/exists → step "company"
   * - mail-config is null/incomplete -> step "mail-config"
   * - identity-provider is null/incomplete -> step "identity-provider"
   * - company exists but org-structure is not completed → step "org-structure"
   * - company exists but Company.setupCompletedAt is null → step "role-templates"
   * - setupCompletedAt is present → "complete"
   */
  async getStatus(): Promise<SetupStep> {
    const superuser = await prisma.user.findFirst({
      where: { isSuperuser: true },
    });
    if (!superuser) {
      return 'superuser';
    }

    if (!superuser.mfaEnabled) {
      return 'superuser-mfa';
    }

    const company = await prisma.company.findFirst();
    if (!company) {
      return 'company';
    }

    if (!company.mailConfigStepCompletedAt) {
      return 'mail-config';
    }

    if (!company.identityProviderStepCompletedAt) {
      return 'identity-provider';
    }

    // Check if org-structure step is complete
    const settings = company.settings as any;
    const orgCompleted = settings?.orgStructureStepCompleted === true;
    if (!orgCompleted) {
      return 'org-structure';
    }

    if (!company.setupCompletedAt) {
      return 'role-templates';
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
   * Creates the company and links the superuser to it.
   * setupCompletedAt remains null until the role templates step is completed.
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
    if (status === 'complete' || status === 'role-templates') {
      throw new Error('Company setup is already complete.');
    }
    if (status === 'superuser') {
      throw new Error('Superuser must be created before completing the company step.');
    }
    if (status === 'superuser-mfa') {
      throw new Error('MFA must be configured for the superuser before completing the company step.');
    }

    // Find the superuser to link
    const superuser = await prisma.user.findFirst({
      where: { isSuperuser: true },
    });
    if (!superuser) {
      throw new Error('Superuser must be created before completing the company step.');
    }

    let appUrl = process.env.APP_URL || 'localhost';
    let domain = appUrl;
    if (domain.includes('://')) {
      domain = domain.split('://')[1];
    }
    domain = domain.split('/')[0].split(':')[0];

    // Create the company with setupCompletedAt set to null initially
    const company = await prisma.company.create({
      data: {
        name: trimmedName,
        contactInfo: trimmedContact,
        setupCompletedAt: null,
        domain,
      },
    });

    // Link the superuser to the new company
    await prisma.user.update({
      where: { id: superuser.id },
      data: { companyId: company.id },
    });

    // Run the RBAC seeding to create the Superuser Role for this company and assign it to this user
    try {
      await seedSuperuserRoles();
    } catch (err) {
      console.error('Failed to seed superuser role during company setup step:', err);
    }

    return company;
  }

  async completeOrgStructureStep(companyId: string, ouNames: string[]) {
    const status = await this.getStatus();
    if (status === 'complete' || status === 'role-templates') {
      throw new Error('Organization setup is already complete.');
    }
    if (status === 'superuser') {
      throw new Error('Superuser must be created before completing organization setup.');
    }
    if (status === 'superuser-mfa') {
      throw new Error('MFA must be configured for the superuser before completing organization setup.');
    }
    if (status === 'company') {
      throw new Error('Company must be set up before completing organization setup.');
    }
    if (status === 'mail-config') {
      throw new Error('Email configuration must be completed or skipped before completing organization setup.');
    }
    if (status === 'identity-provider') {
      throw new Error('Identity provider configuration must be completed or skipped before completing organization setup.');
    }

    // Create the top-level OUs
    for (const name of ouNames) {
      const trimmed = name.trim();
      if (trimmed) {
        await prisma.organizationUnit.create({
          data: {
            name: trimmed,
            companyId,
            parentId: null
          }
        });
      }
    }

    // Save the completion flag in company settings
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const currentSettings = (company?.settings as any) || {};
    const updatedSettings = { ...currentSettings, orgStructureStepCompleted: true };

    return await prisma.company.update({
      where: { id: companyId },
      data: {
        settings: updatedSettings
      }
    });
  }

  /**
   * Seeds default role templates for the company, then sets setupCompletedAt to now.
   * This is the final completion step of the wizard.
   */
  async completeRoleTemplatesStep(companyId: string, selectedNames: string[]) {
    const status = await this.getStatus();
    if (status === 'complete') {
      throw new Error('Setup is already complete.');
    }
    if (status === 'superuser') {
      throw new Error('Superuser must be created before completing the role templates step.');
    }
    if (status === 'superuser-mfa') {
      throw new Error('MFA must be configured for the superuser before completing the role templates step.');
    }
    if (status === 'company') {
      throw new Error('Company must be set up before completing the role templates step.');
    }
    if (status === 'mail-config') {
      throw new Error('Email configuration must be completed or skipped before completing the role templates step.');
    }
    if (status === 'identity-provider') {
      throw new Error('Identity provider configuration must be completed or skipped before completing the role templates step.');
    }

    // Call seedTemplates
    await roleTemplatesService.seedTemplates(companyId, selectedNames);

    // Set company's setupCompletedAt to now to mark the setup as complete
    const company = await prisma.company.update({
      where: { id: companyId },
      data: { setupCompletedAt: new Date() },
    });

    return company;
  }
}

export const setupWizardService = new SetupWizardService();
