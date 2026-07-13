import { prisma } from '../../../shared/db/prisma';
import { ProfileFieldType } from '@prisma/client';

export interface ProfileFieldResponse {
  fieldDefinitionId: string;
  fieldKey: string | null;
  name: string;
  description: string | null;
  fieldType: ProfileFieldType;
  required: boolean;
  visible: boolean;
  editableByUser: boolean;
  isSystemField: boolean;
  displayOrder: number;
  category: { id: string; name: string; displayOrder: number } | null;
  value: string | null;
}

export class ProfileFieldValueService {
  /**
   * Helper method to map system fields from a loaded user entity.
   */
  private getSystemFieldValue(user: any, fieldKey: string): string | null {
    switch (fieldKey) {
      case 'firstName':
        return user.firstName || null;
      case 'lastName':
        return user.lastName || null;
      case 'email':
        return user.email || null;
      case 'profilePicture':
        return user.profilePicturePath || null;
      case 'accountStatus':
        return user.status || null;
      case 'assignedRoles':
        return user.role ? user.role.name : '';
      case 'assignedOrganization': {
        const orgs = user.memberships
          .filter((m: any) => m.organizationUnit && !m.deletedAt)
          .map((m: any) => m.organizationUnit.name);
        return orgs.join(', ');
      }
      case 'assignedGroups': {
        const groups = user.memberships
          .filter((m: any) => m.learningGroup && !m.deletedAt)
          .map((m: any) => m.learningGroup.name);
        return groups.join(', ');
      }
      case 'createdDate':
        return user.createdAt ? user.createdAt.toISOString() : null;
      case 'lastLogin':
        return user.lastLoginAt ? user.lastLoginAt.toISOString() : null;
      case 'loginProvider':
        return user.passwordHash ? 'Local' : 'External';
      default:
        return null;
    }
  }

  /**
   * Returns every visible field (system + custom) for targetUserId.
   * Values are included if the requesting user is permitted to view.
   * For the MVP, visibility defaults to true for all requesting users.
   */
  async getProfile(targetUserId: string, requestingUserId: string): Promise<ProfileFieldResponse[]> {
    // 1. Fetch the target user with all necessary system field relations
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        role: true,
        memberships: {
          include: {
            organizationUnit: true,
            learningGroup: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error(`User with ID ${targetUserId} not found.`);
    }

    if (!user.companyId) {
      throw new Error('Target user is not associated with any company.');
    }

    // 2. Fetch all profile field definitions where visible = true
    const definitions = await prisma.profileFieldDefinition.findMany({
      where: {
        companyId: user.companyId,
        visible: true,
      },
      include: {
        category: true,
      },
      orderBy: [
        { category: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
      ],
    });

    // 3. Fetch custom field values
    const customValues = await prisma.profileFieldValue.findMany({
      where: { userId: targetUserId },
    });

    const customValuesMap = new Map<string, string | null>();
    for (const val of customValues) {
      customValuesMap.set(val.fieldDefinitionId, val.value);
    }

    // 4. Map the fields and values
    const profileFields: ProfileFieldResponse[] = [];

    for (const def of definitions) {
      let value: string | null = null;

      if (def.isSystemField && def.fieldKey) {
        value = this.getSystemFieldValue(user, def.fieldKey);
      } else {
        value = customValuesMap.get(def.id) ?? def.defaultValue ?? null;
      }

      profileFields.push({
        fieldDefinitionId: def.id,
        fieldKey: def.fieldKey,
        name: def.name,
        description: def.description,
        fieldType: def.fieldType,
        required: def.required,
        visible: def.visible,
        editableByUser: def.editableByUser,
        isSystemField: def.isSystemField,
        displayOrder: def.displayOrder,
        category: def.category
          ? {
              id: def.category.id,
              name: def.category.name,
              displayOrder: def.category.displayOrder,
            }
          : null,
        value,
      });
    }

    return profileFields;
  }

  /**
   * Sets the value for a profile field for targetUserId, enforcing editing permissions and type validation.
   */
  async setFieldValue(
    targetUserId: string,
    fieldDefinitionId: string,
    value: string | null,
    requestingUserId: string
  ) {
    // 1. Fetch requesting user with role
    const requestingUser = await prisma.user.findUnique({
      where: { id: requestingUserId },
      include: { role: true },
    });
    if (!requestingUser) {
      throw new Error(`Requesting user with ID ${requestingUserId} not found.`);
    }

    // 2. Fetch field definition
    const field = await prisma.profileFieldDefinition.findUnique({
      where: { id: fieldDefinitionId },
    });
    if (!field) {
      throw new Error(`Field definition with ID ${fieldDefinitionId} not found.`);
    }

    // 3. Permission checks
    const isOwner = targetUserId === requestingUserId;

    if (isOwner) {
      // Rejects if owner, but editableByUser is false
      if (!field.editableByUser) {
        throw new Error('You are not permitted to edit this field.');
      }
    } else {
      // Not the owner. Only allowed if Superuser or role is in field's FieldEditableByRole list.
      const isSuperuser = requestingUser.isSuperuser;
      let isPermittedByRole = false;

      if (!isSuperuser && requestingUser.roleId) {
        const editableRole = await prisma.fieldEditableByRole.findUnique({
          where: {
            fieldDefinitionId_roleId: {
              fieldDefinitionId,
              roleId: requestingUser.roleId,
            },
          },
        });
        if (editableRole) {
          isPermittedByRole = true;
        }
      }

      if (!isSuperuser && !isPermittedByRole) {
        throw new Error('Your role is not permitted to edit this field.');
      }
    }

    // 4. Field Validation
    const trimmedVal = value !== null && value !== undefined ? String(value).trim() : null;

    if (field.required && (trimmedVal === null || trimmedVal === '')) {
      throw new Error(`Field '${field.name}' is required.`);
    }

    // If a value is provided, validate it against its type and validation rules
    if (trimmedVal !== null && trimmedVal !== '') {
      switch (field.fieldType) {
        case ProfileFieldType.EMAIL: {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(trimmedVal)) {
            throw new Error(`Invalid email format for field '${field.name}'.`);
          }
          break;
        }
        case ProfileFieldType.NUMBER: {
          const num = Number(trimmedVal);
          if (isNaN(num)) {
            throw new Error(`Value for field '${field.name}' must be a valid number.`);
          }

          // Validate rules if defined (e.g. min/max)
          const rules = field.validationRules ? (field.validationRules as any) : null;
          if (rules) {
            if (typeof rules.min === 'number' && num < rules.min) {
              throw new Error(`Value for field '${field.name}' cannot be less than ${rules.min}.`);
            }
            if (typeof rules.max === 'number' && num > rules.max) {
              throw new Error(`Value for field '${field.name}' cannot be greater than ${rules.max}.`);
            }
          }
          break;
        }
        case ProfileFieldType.DATE: {
          const timestamp = Date.parse(trimmedVal);
          if (isNaN(timestamp)) {
            throw new Error(`Value for field '${field.name}' must be a valid date format.`);
          }
          break;
        }
        case ProfileFieldType.CHECKBOX: {
          const normalized = trimmedVal.toLowerCase();
          if (normalized !== 'true' && normalized !== 'false') {
            throw new Error(`Value for checkbox field '${field.name}' must be 'true' or 'false'.`);
          }
          break;
        }
        case ProfileFieldType.DROPDOWN:
        case ProfileFieldType.RADIO: {
          if (field.options) {
            const optionsArray = Array.isArray(field.options) ? field.options : [];
            const validOptions = optionsArray.map((opt: any) => {
              if (typeof opt === 'string') return opt.trim();
              if (opt && typeof opt === 'object' && opt.value !== undefined) return String(opt.value).trim();
              return String(opt).trim();
            });
            if (!validOptions.includes(trimmedVal)) {
              throw new Error(`Value for field '${field.name}' must be one of the configured options.`);
            }
          }
          break;
        }
        case ProfileFieldType.TEXT:
        case ProfileFieldType.MULTILINE:
        case ProfileFieldType.PHONE: {
          // Custom validation rules e.g., regex pattern
          const rules = field.validationRules ? (field.validationRules as any) : null;
          if (rules && rules.pattern) {
            try {
              const regex = new RegExp(rules.pattern);
              if (!regex.test(trimmedVal)) {
                throw new Error(rules.errorMessage || `Value does not match the required format for field '${field.name}'.`);
              }
            } catch (err: any) {
              if (err.message && err.message.includes("Value does not match")) {
                throw err;
              }
              // Ignore invalid regex compilation errors in db rules
            }
          }
          break;
        }
      }
    }

    // 5. Persistence
    if (field.isSystemField) {
      // Manage writable system fields
      if (!field.fieldKey) {
        throw new Error('System field is missing fieldKey.');
      }

      const allowedSystemFields = ['firstName', 'lastName', 'profilePicture', 'email'];
      if (!allowedSystemFields.includes(field.fieldKey)) {
        throw new Error('This system field is read-only and cannot be modified.');
      }

      // Map to real User columns
      const updateData: any = {};
      if (field.fieldKey === 'firstName') updateData.firstName = trimmedVal;
      if (field.fieldKey === 'lastName') updateData.lastName = trimmedVal;
      if (field.fieldKey === 'profilePicture') updateData.profilePicturePath = trimmedVal;
      if (field.fieldKey === 'email') updateData.email = trimmedVal ? trimmedVal.toLowerCase() : null;

      return await prisma.user.update({
        where: { id: targetUserId },
        data: updateData,
      });
    } else {
      // Custom field: upsert ProfileFieldValue row
      return await prisma.profileFieldValue.upsert({
        where: {
          userId_fieldDefinitionId: {
            userId: targetUserId,
            fieldDefinitionId: field.id,
          },
        },
        create: {
          userId: targetUserId,
          fieldDefinitionId: field.id,
          value: trimmedVal,
        },
        update: {
          value: trimmedVal,
        },
      });
    }
  }

  /**
   * Returns profile completion metrics for a user, including the percentage
   * and a detailed list of missing required visible fields.
   */
  async getProfileCompletionPercentage(userId: string) {
    const profile = await this.getProfile(userId, userId);

    const visibleFields = profile.filter((f) => f.visible);
    const totalFields = visibleFields.length;

    if (totalFields === 0) {
      return {
        percentage: 100,
        missingFields: [],
      };
    }

    const filledFields = visibleFields.filter(
      (f) => f.value !== null && f.value !== undefined && String(f.value).trim() !== ''
    );

    const percentage = Math.round((filledFields.length / totalFields) * 100);

    const missingFields = visibleFields
      .filter(
        (f) =>
          f.required && (f.value === null || f.value === undefined || String(f.value).trim() === '')
      )
      .map((f) => ({
        id: f.fieldDefinitionId,
        fieldKey: f.fieldKey,
        name: f.name,
        required: f.required,
      }));

    return {
      percentage,
      missingFields,
    };
  }
}
