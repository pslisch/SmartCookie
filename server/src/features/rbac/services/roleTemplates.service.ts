import { prisma } from '../../../shared/db/prisma';

export class RoleTemplatesService {
  private allowedTemplates = [
    'LMS Manager',
    'Content Creator',
    'User Manager',
    'Service Desk',
    'Learner',
  ];

  /**
   * Seeds default role templates for a company.
   * Only allows specific predefined role template names.
   * Idempotent: Skips any roles that already exist for the company.
   */
  async seedTemplates(companyId: string, selectedNames: string[]) {
    // Filter selectedNames to only contain those in allowedTemplates
    const validNames = selectedNames.filter((name) =>
      this.allowedTemplates.includes(name)
    );

    const createdRoles = [];

    for (const name of validNames) {
      // Check if role with this name already exists for the company
      const existingRole = await prisma.role.findFirst({
        where: {
          companyId,
          name,
        },
      });

      if (!existingRole) {
        const newRole = await prisma.role.create({
          data: {
            name,
            companyId,
            isProtected: false,
          },
        });
        createdRoles.push(newRole);
      }
    }

    return createdRoles;
  }
}

export const roleTemplatesService = new RoleTemplatesService();
