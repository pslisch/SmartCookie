import { prisma } from '../../src/shared/db/prisma';

/**
 * Seed/backfill the protected Superuser Role for all companies and assign it to the corresponding superusers.
 */
export async function seedSuperuserRoles() {
  console.log('[RBAC Seed] Running Superuser role seed/backfill...');

  const companies = await prisma.company.findMany();

  for (const company of companies) {
    // 1. Check if the protected Superuser role already exists for this company
    let superuserRole = await prisma.role.findFirst({
      where: {
        companyId: company.id,
        name: 'Superuser',
        isProtected: true,
      },
    });

    if (!superuserRole) {
      console.log(`[RBAC Seed] Creating protected Superuser role for company: ${company.name} (${company.id})`);
      superuserRole = await prisma.role.create({
        data: {
          name: 'Superuser',
          isProtected: true,
          companyId: company.id,
        },
      });
    }

    // 2. Find the superuser user(s) for this company and backfill their roleId
    const superusers = await prisma.user.findMany({
      where: {
        isSuperuser: true,
        companyId: company.id,
      },
    });

    for (const su of superusers) {
      if (su.roleId !== superuserRole.id) {
        console.log(`[RBAC Seed] Assigning Superuser role to user: ${su.username || su.email || su.id}`);
        await prisma.user.update({
          where: { id: su.id },
          data: { roleId: superuserRole.id },
        });
      }
    }
  }

  console.log('[RBAC Seed] Superuser role seed/backfill complete.');
}
