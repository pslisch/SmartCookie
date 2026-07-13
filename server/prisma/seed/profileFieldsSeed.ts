import { prisma } from '../../src/shared/db/prisma';
import { ProfileFieldType } from '@prisma/client';

/**
 * Seed system profile field definitions for all existing companies.
 * This runs idempotently once per company.
 */
export async function seedProfileFields() {
  console.log('[Profile Fields Seed] Running system profile field definitions seed...');

  const companies = await prisma.company.findMany();

  const coreFields = [
    {
      fieldKey: 'firstName',
      name: 'First Name',
      fieldType: ProfileFieldType.TEXT,
      required: false,
      visible: true,
      editableByUser: true,
      displayOrder: 1,
    },
    {
      fieldKey: 'lastName',
      name: 'Last Name',
      fieldType: ProfileFieldType.TEXT,
      required: false,
      visible: true,
      editableByUser: true,
      displayOrder: 2,
    },
    {
      fieldKey: 'email',
      name: 'Email Address',
      fieldType: ProfileFieldType.EMAIL,
      required: true,
      visible: true,
      editableByUser: false,
      displayOrder: 3,
    },
    {
      fieldKey: 'profilePicture',
      name: 'Profile Picture',
      fieldType: ProfileFieldType.TEXT,
      required: false,
      visible: true,
      editableByUser: true,
      displayOrder: 4,
    },
    {
      fieldKey: 'accountStatus',
      name: 'Account Status',
      fieldType: ProfileFieldType.TEXT,
      required: false,
      visible: true,
      editableByUser: false,
      displayOrder: 5,
    },
    {
      fieldKey: 'assignedRoles',
      name: 'Assigned Roles',
      fieldType: ProfileFieldType.TEXT,
      required: false,
      visible: true,
      editableByUser: false,
      displayOrder: 6,
    },
    {
      fieldKey: 'assignedOrganization',
      name: 'Assigned Organization',
      fieldType: ProfileFieldType.TEXT,
      required: false,
      visible: true,
      editableByUser: false,
      displayOrder: 7,
    },
    {
      fieldKey: 'assignedGroups',
      name: 'Assigned Groups',
      fieldType: ProfileFieldType.TEXT,
      required: false,
      visible: true,
      editableByUser: false,
      displayOrder: 8,
    },
    {
      fieldKey: 'createdDate',
      name: 'Created Date',
      fieldType: ProfileFieldType.DATE,
      required: false,
      visible: true,
      editableByUser: false,
      displayOrder: 9,
    },
    {
      fieldKey: 'lastLogin',
      name: 'Last Login',
      fieldType: ProfileFieldType.DATE,
      required: false,
      visible: true,
      editableByUser: false,
      displayOrder: 10,
    },
    {
      fieldKey: 'loginProvider',
      name: 'Login Provider',
      fieldType: ProfileFieldType.TEXT,
      required: false,
      visible: true,
      editableByUser: false,
      displayOrder: 11,
    },
  ];

  for (const company of companies) {
    for (const field of coreFields) {
      const existing = await prisma.profileFieldDefinition.findFirst({
        where: {
          companyId: company.id,
          fieldKey: field.fieldKey,
        },
      });

      if (!existing) {
        console.log(`[Profile Fields Seed] Creating system field '${field.fieldKey}' for company: ${company.name}`);
        await prisma.profileFieldDefinition.create({
          data: {
            companyId: company.id,
            fieldKey: field.fieldKey,
            name: field.name,
            fieldType: field.fieldType,
            required: field.required,
            visible: field.visible,
            editableByUser: field.editableByUser,
            displayOrder: field.displayOrder,
            isSystemField: true,
          },
        });
      }
    }
  }

  console.log('[Profile Fields Seed] System profile field definitions seed complete.');
}
