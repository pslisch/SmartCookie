import { prisma } from '../../../shared/db/prisma';
import { ProfileFieldType } from '@prisma/client';

export class ProfileFieldService {
  /**
   * Creates a new profile field category for a company.
   */
  async createCategory(companyId: string, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Category name is required.');
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new Error(`Company with ID ${companyId} not found.`);
    }

    // Calculate next display order
    const maxOrderField = await prisma.profileFieldCategory.findFirst({
      where: { companyId },
      orderBy: { displayOrder: 'desc' },
    });
    const nextOrder = maxOrderField ? maxOrderField.displayOrder + 1 : 1;

    return await prisma.profileFieldCategory.create({
      data: {
        companyId,
        name: trimmedName,
        displayOrder: nextOrder,
      },
    });
  }

  /**
   * Renames an existing profile field category.
   */
  async renameCategory(categoryId: string, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Category name is required.');
    }

    const category = await prisma.profileFieldCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new Error(`Category with ID ${categoryId} not found.`);
    }

    return await prisma.profileFieldCategory.update({
      where: { id: categoryId },
      data: { name: trimmedName },
    });
  }

  /**
   * Updates the display order of a profile field category.
   */
  async reorderCategory(categoryId: string, newOrder: number) {
    const category = await prisma.profileFieldCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new Error(`Category with ID ${categoryId} not found.`);
    }

    return await prisma.profileFieldCategory.update({
      where: { id: categoryId },
      data: { displayOrder: newOrder },
    });
  }

  /**
   * Creates a new custom profile field definition.
   * Reject attempts to create a field with a fieldKey or isSystemField=true (which are system fields).
   */
  async createField(
    companyId: string,
    data: {
      name: string;
      categoryId?: string | null;
      description?: string | null;
      fieldType: ProfileFieldType;
      required: boolean;
      visible?: boolean;
      editableByUser?: boolean;
      displayOrder?: number;
      defaultValue?: string | null;
      validationRules?: any;
      options?: any;
    }
  ) {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new Error('Field name is required.');
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new Error(`Company with ID ${companyId} not found.`);
    }

    if (data.categoryId) {
      const category = await prisma.profileFieldCategory.findUnique({
        where: { id: data.categoryId },
      });
      if (!category || category.companyId !== companyId) {
        throw new Error('Invalid category ID or category belongs to another company.');
      }
    }

    // Determine display order if not provided
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxOrderField = await prisma.profileFieldDefinition.findFirst({
        where: { companyId, categoryId: data.categoryId || null },
        orderBy: { displayOrder: 'desc' },
      });
      displayOrder = maxOrderField ? maxOrderField.displayOrder + 1 : 1;
    }

    return await prisma.profileFieldDefinition.create({
      data: {
        companyId,
        categoryId: data.categoryId || null,
        name: trimmedName,
        description: data.description || null,
        fieldType: data.fieldType,
        required: data.required,
        visible: data.visible !== undefined ? data.visible : true,
        editableByUser: data.editableByUser !== undefined ? data.editableByUser : true,
        displayOrder,
        defaultValue: data.defaultValue || null,
        validationRules: data.validationRules || null,
        options: data.options || null,
        isSystemField: false,
        fieldKey: null,
      },
    });
  }

  /**
   * Updates an existing profile field definition.
   * For system fields, only name/description/category/visible/required can be changed.
   * fieldKey, fieldType, isSystemField are strictly immutable.
   */
  async updateField(
    fieldId: string,
    data: {
      name?: string;
      categoryId?: string | null;
      description?: string | null;
      required?: boolean;
      visible?: boolean;
      editableByUser?: boolean;
      displayOrder?: number;
      defaultValue?: string | null;
      validationRules?: any;
      options?: any;
      fieldKey?: string | null;
      fieldType?: ProfileFieldType;
      isSystemField?: boolean;
    }
  ) {
    const field = await prisma.profileFieldDefinition.findUnique({
      where: { id: fieldId },
    });
    if (!field) {
      throw new Error(`Field definition with ID ${fieldId} not found.`);
    }

    const updateData: any = {};

    if (field.isSystemField) {
      // System fields validation: fieldKey, fieldType, isSystemField, and editableByUser are immutable.
      if (data.fieldKey !== undefined && data.fieldKey !== field.fieldKey) {
        throw new Error('System fields cannot have their fieldKey changed.');
      }
      if (data.fieldType !== undefined && data.fieldType !== field.fieldType) {
        throw new Error('System fields cannot have their fieldType changed.');
      }
      if (data.isSystemField !== undefined && data.isSystemField !== field.isSystemField) {
        throw new Error('System fields isSystemField property cannot be changed.');
      }
      if (data.editableByUser !== undefined && data.editableByUser !== field.editableByUser) {
        throw new Error('System fields cannot have their editableByUser property changed.');
      }

      // Allowed updates for system fields
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.description !== undefined) updateData.description = data.description;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.visible !== undefined) updateData.visible = data.visible;
      if (data.required !== undefined) updateData.required = data.required;
      if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    } else {
      // Custom fields allowed updates
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.required !== undefined) updateData.required = data.required;
      if (data.visible !== undefined) updateData.visible = data.visible;
      if (data.editableByUser !== undefined) updateData.editableByUser = data.editableByUser;
      if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
      if (data.defaultValue !== undefined) updateData.defaultValue = data.defaultValue;
      if (data.validationRules !== undefined) updateData.validationRules = data.validationRules;
      if (data.options !== undefined) updateData.options = data.options;
    }

    if (updateData.categoryId) {
      const category = await prisma.profileFieldCategory.findUnique({
        where: { id: updateData.categoryId },
      });
      if (!category || category.companyId !== field.companyId) {
        throw new Error('Invalid category ID or category belongs to another company.');
      }
    }

    return await prisma.profileFieldDefinition.update({
      where: { id: fieldId },
      data: updateData,
    });
  }

  /**
   * Deletes a custom profile field definition.
   * Rejects if it is a system field.
   */
  async deleteField(fieldId: string) {
    const field = await prisma.profileFieldDefinition.findUnique({
      where: { id: fieldId },
    });
    if (!field) {
      throw new Error(`Field definition with ID ${fieldId} not found.`);
    }

    if (field.isSystemField) {
      throw new Error('core profile fields cannot be removed');
    }

    return await prisma.profileFieldDefinition.delete({
      where: { id: fieldId },
    });
  }

  /**
   * Moves a profile field up in displayOrder within its category (or null category).
   * Swaps displayOrder with the adjacent field above. Safe no-op if already first.
   */
  async moveFieldUp(fieldId: string) {
    const field = await prisma.profileFieldDefinition.findUnique({
      where: { id: fieldId },
    });
    if (!field) {
      throw new Error(`Field definition with ID ${fieldId} not found.`);
    }

    const categoryId = field.categoryId;
    const companyId = field.companyId;

    // Find the adjacent field above (largest displayOrder that is less than current field's displayOrder)
    const adjacentField = await prisma.profileFieldDefinition.findFirst({
      where: {
        companyId,
        categoryId: categoryId || null,
        displayOrder: { lt: field.displayOrder },
      },
      orderBy: { displayOrder: 'desc' },
    });

    if (!adjacentField) {
      // Already first, safe no-op
      return field;
    }

    // Swap displayOrder values inside a transaction
    await prisma.$transaction([
      prisma.profileFieldDefinition.update({
        where: { id: field.id },
        data: { displayOrder: adjacentField.displayOrder },
      }),
      prisma.profileFieldDefinition.update({
        where: { id: adjacentField.id },
        data: { displayOrder: field.displayOrder },
      }),
    ]);

    return await prisma.profileFieldDefinition.findUnique({
      where: { id: fieldId },
    });
  }

  /**
   * Moves a profile field down in displayOrder within its category (or null category).
   * Swaps displayOrder with the adjacent field below. Safe no-op if already last.
   */
  async moveFieldDown(fieldId: string) {
    const field = await prisma.profileFieldDefinition.findUnique({
      where: { id: fieldId },
    });
    if (!field) {
      throw new Error(`Field definition with ID ${fieldId} not found.`);
    }

    const categoryId = field.categoryId;
    const companyId = field.companyId;

    // Find the adjacent field below (smallest displayOrder that is greater than current field's displayOrder)
    const adjacentField = await prisma.profileFieldDefinition.findFirst({
      where: {
        companyId,
        categoryId: categoryId || null,
        displayOrder: { gt: field.displayOrder },
      },
      orderBy: { displayOrder: 'asc' },
    });

    if (!adjacentField) {
      // Already last, safe no-op
      return field;
    }

    // Swap displayOrder values inside a transaction
    await prisma.$transaction([
      prisma.profileFieldDefinition.update({
        where: { id: field.id },
        data: { displayOrder: adjacentField.displayOrder },
      }),
      prisma.profileFieldDefinition.update({
        where: { id: adjacentField.id },
        data: { displayOrder: field.displayOrder },
      }),
    ]);

    return await prisma.profileFieldDefinition.findUnique({
      where: { id: fieldId },
    });
  }

  /**
   * Replaces the roles that are permitted to edit this field for other users.
   */
  async setEditableByRoles(fieldId: string, roleIds: string[]) {
    const field = await prisma.profileFieldDefinition.findUnique({
      where: { id: fieldId },
    });
    if (!field) {
      throw new Error(`Field definition with ID ${fieldId} not found.`);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing join rows
      await tx.fieldEditableByRole.deleteMany({
        where: { fieldDefinitionId: fieldId },
      });

      // 2. Insert new join rows
      if (roleIds.length > 0) {
        // First verify roles exist in this company
        const roles = await tx.role.findMany({
          where: {
            id: { in: roleIds },
            companyId: field.companyId,
          },
        });

        if (roles.length !== roleIds.length) {
          throw new Error('Some roles are invalid or do not belong to the same company.');
        }

        await tx.fieldEditableByRole.createMany({
          data: roleIds.map((roleId) => ({
            fieldDefinitionId: fieldId,
            roleId,
          })),
        });
      }
    });

    return await prisma.profileFieldDefinition.findUnique({
      where: { id: fieldId },
      include: { editableByRoles: true },
    });
  }
}
