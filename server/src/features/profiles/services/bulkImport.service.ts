import { prisma } from '../../../shared/db/prisma';
import { TokenPurpose, UserStatus, NotificationType } from '@prisma/client';
import { INVITATION_TTL_SECONDS } from '../../../shared/constants';
import { membershipAssignmentHooksService } from '../../assignments/services/membershipAssignmentHooks.service';
import { emailService } from '../../../shared/email/email.service';
import crypto from 'crypto';

export interface RowResult {
  row: number;
  email: string;
  valid: boolean;
  errors: string[];
}

/**
 * Robust, standard RFC-4180 compliant CSV Parser.
 * Handles quoted fields, commas inside quotes, escaped quotes (""), and multiple line endings.
 */
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        cell += '"';
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      row.push(cell);
      if (row.length > 1 || row[0] !== '') {
        result.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    result.push(row);
  }

  return result.map((r) => r.map((c) => c.trim()));
}

/**
 * Robust RFC-4180 compliant CSV Formatter.
 */
export function formatCSV(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const escaped = cell.replace(/"/g, '""');
          if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
            return `"${escaped}"`;
          }
          return escaped;
        })
        .join(',')
    )
    .join('\n');
}

export class BulkImportService {
  /**
   * Generates a template CSV file for bulk import.
   * Headers: email, firstName, lastName, role, organizationUnit, groups, + any currently-required custom fields.
   */
  async generateTemplate(companyId: string): Promise<string> {
    const requiredFields = await prisma.profileFieldDefinition.findMany({
      where: {
        companyId,
        required: true,
        isSystemField: false,
      },
      select: {
        fieldKey: true,
        name: true,
      },
    });

    const headers = ['email', 'firstName', 'lastName', 'role', 'organizationUnit', 'groups'];
    for (const f of requiredFields) {
      headers.push(f.fieldKey || f.name);
    }

    // Try to find a real role, OU, and group to make a premium realistic template example
    const sampleRole = await prisma.role.findFirst({ where: { companyId } });
    const sampleOU = await prisma.organizationUnit.findFirst({ where: { companyId, deletedAt: null } });
    const sampleGroup = await prisma.learningGroup.findFirst({ where: { companyId, deletedAt: null } });

    const exampleRow = [
      'john.doe@example.com',
      'John',
      'Doe',
      sampleRole?.name || 'Learner',
      sampleOU?.name || 'Sales',
      sampleGroup?.name || 'Sales Group',
    ];

    for (const f of requiredFields) {
      exampleRow.push('Value');
    }

    return formatCSV([headers, exampleRow]);
  }

  /**
   * Helper to parse and prepare import rows with validations.
   */
  private async prepareAndValidate(
    companyId: string,
    csvContent: string
  ): Promise<{
    rows: string[][];
    headers: string[];
    results: RowResult[];
    emailIndex: number;
    firstNameIndex: number;
    lastNameIndex: number;
    roleIndex: number;
    organizationUnitIndex: number;
    groupsIndex: number;
    headerIndexToField: Map<number, any>;
    parsedRowsData: Array<{
      rowNum: number;
      email: string;
      firstName: string;
      lastName: string;
      matchedRole: any;
      matchedOU: any;
      matchedGroups: any[];
      customFieldsData: Array<{ fieldId: string; value: string }>;
    }>;
  }> {
    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
      throw new Error('CSV file is empty.');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Find indices for standard columns
    const emailIndex = headers.findIndex((h) => {
      const norm = h.toLowerCase();
      return norm === 'email' || norm === 'emailaddress' || norm === 'email_address';
    });
    const firstNameIndex = headers.findIndex((h) => {
      const norm = h.toLowerCase();
      return norm === 'firstname' || norm === 'first_name' || norm === 'first name';
    });
    const lastNameIndex = headers.findIndex((h) => {
      const norm = h.toLowerCase();
      return norm === 'lastname' || norm === 'last_name' || norm === 'last name';
    });
    const roleIndex = headers.findIndex((h) => {
      const norm = h.toLowerCase();
      return norm === 'role' || norm === 'role_id' || norm === 'rolename';
    });
    const organizationUnitIndex = headers.findIndex((h) => {
      const norm = h.toLowerCase();
      return norm === 'organizationunit' || norm === 'organization_unit' || norm === 'organization unit' || norm === 'ou';
    });
    const groupsIndex = headers.findIndex((h) => {
      const norm = h.toLowerCase();
      return norm === 'groups' || norm === 'learning_groups' || norm === 'learning groups';
    });

    const results: RowResult[] = [];
    const parsedRowsData: any[] = [];

    // Fetch database entities for validation
    const profileFields = await prisma.profileFieldDefinition.findMany({
      where: { companyId },
    });

    const roles = await prisma.role.findMany({
      where: { companyId },
    });

    const organizationUnits = await prisma.organizationUnit.findMany({
      where: { companyId, deletedAt: null },
    });

    const learningGroups = await prisma.learningGroup.findMany({
      where: { companyId, deletedAt: null },
    });

    // Map custom field columns
    const headerIndexToField = new Map<number, any>();
    headers.forEach((header, idx) => {
      if (
        idx === emailIndex ||
        idx === firstNameIndex ||
        idx === lastNameIndex ||
        idx === roleIndex ||
        idx === organizationUnitIndex ||
        idx === groupsIndex
      ) {
        return;
      }

      const normHeader = header.toLowerCase();
      const field = profileFields.find(
        (f) => f.fieldKey?.toLowerCase() === normHeader || f.name.toLowerCase() === normHeader
      );
      if (field) {
        headerIndexToField.set(idx, field);
      }
    });

    const requiredFields = profileFields.filter((f) => f.required && !f.isSystemField);

    // Validate headers
    const missingHeaders: string[] = [];
    if (emailIndex === -1) missingHeaders.push('email');
    if (roleIndex === -1) missingHeaders.push('role');

    for (const rf of requiredFields) {
      const isMapped = Array.from(headerIndexToField.values()).some((f) => f.id === rf.id);
      if (!isMapped) {
        missingHeaders.push(rf.name);
      }
    }

    if (missingHeaders.length > 0) {
      throw new Error(`CSV is missing required columns: ${missingHeaders.join(', ')}`);
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const fileEmailsSeen = new Set<string>();

    // Fetch all existing users' emails to check duplicates against database
    const existingUsers = await prisma.user.findMany({
      where: { companyId },
      select: { email: true },
    });
    const dbEmails = new Set(existingUsers.map((u) => u.email?.toLowerCase()).filter(Boolean));

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // header is row 1, 1-based indexing for sheets is row 2
      const errors: string[] = [];

      // Check if row is completely empty
      if (row.length === 0 || (row.length === 1 && row[0] === '')) {
        continue;
      }

      const emailVal = emailIndex !== -1 ? (row[emailIndex] || '').trim() : '';
      const firstNameVal = firstNameIndex !== -1 ? (row[firstNameIndex] || '').trim() : '';
      const lastNameVal = lastNameIndex !== -1 ? (row[lastNameIndex] || '').trim() : '';
      const roleVal = roleIndex !== -1 ? (row[roleIndex] || '').trim() : '';
      const ouVal = organizationUnitIndex !== -1 ? (row[organizationUnitIndex] || '').trim() : '';
      const groupsVal = groupsIndex !== -1 ? (row[groupsIndex] || '').trim() : '';

      // 1. Email validation
      if (!emailVal) {
        errors.push('Email is required.');
      } else if (!EMAIL_REGEX.test(emailVal)) {
        errors.push(`Invalid email format: "${emailVal}".`);
      } else {
        const lowerEmail = emailVal.toLowerCase();
        if (fileEmailsSeen.has(lowerEmail)) {
          errors.push(`Duplicate email within the import file: "${emailVal}".`);
        } else {
          fileEmailsSeen.add(lowerEmail);
        }

        if (dbEmails.has(lowerEmail)) {
          errors.push(`A user with email "${emailVal}" already exists in the system.`);
        }
      }

      // 2. Role validation
      let matchedRole: any = null;
      if (!roleVal) {
        errors.push('Role is required.');
      } else {
        matchedRole = roles.find((r) => r.id === roleVal || r.name.toLowerCase() === roleVal.toLowerCase());
        if (!matchedRole) {
          errors.push(`Role "${roleVal}" does not exist.`);
        }
      }

      // 3. OrganizationUnit validation
      let matchedOU: any = null;
      if (ouVal) {
        matchedOU = organizationUnits.find((o) => o.id === ouVal || o.name.toLowerCase() === ouVal.toLowerCase());
        if (!matchedOU) {
          errors.push(`Organization unit "${ouVal}" does not exist.`);
        }
      }

      // 4. LearningGroups validation
      const matchedGroups: any[] = [];
      if (groupsVal) {
        // Handle comma-separated list of groups, stripping quotes if any
        const groupNames = groupsVal.split(',').map((g) => g.trim().replace(/^"|"$/g, '').trim()).filter(Boolean);
        for (const gn of groupNames) {
          const group = learningGroups.find((g) => g.id === gn || g.name.toLowerCase() === gn.toLowerCase());
          if (!group) {
            errors.push(`Learning group "${gn}" does not exist.`);
          } else {
            matchedGroups.push(group);
          }
        }
      }

      // 5. Custom profile fields validation
      const customFieldsData: Array<{ fieldId: string; value: string }> = [];
      for (const [idx, field] of headerIndexToField.entries()) {
        const val = (row[idx] || '').trim();
        if (field.required && !val) {
          errors.push(`Required custom field "${field.name}" is empty.`);
        }
        if (val) {
          customFieldsData.push({ fieldId: field.id, value: val });
        }
      }

      const isValid = errors.length === 0;
      results.push({
        row: rowNum,
        email: emailVal,
        valid: isValid,
        errors,
      });

      if (isValid) {
        parsedRowsData.push({
          rowNum,
          email: emailVal,
          firstName: firstNameVal,
          lastName: lastNameVal,
          matchedRole,
          matchedOU,
          matchedGroups,
          customFieldsData,
        });
      }
    }

    return {
      rows,
      headers,
      results,
      emailIndex,
      firstNameIndex,
      lastNameIndex,
      roleIndex,
      organizationUnitIndex,
      groupsIndex,
      headerIndexToField,
      parsedRowsData,
    };
  }

  /**
   * Dry-run dry validation of the import CSV.
   */
  async validate(companyId: string, csvContent: string): Promise<RowResult[]> {
    const prep = await this.prepareAndValidate(companyId, csvContent);
    return prep.results;
  }

  /**
   * Confirms and creates all users in the CSV in an all-or-nothing transaction.
   * If any row has validation errors, nothing is written and the full validation results are returned.
   */
  async confirm(companyId: string, csvContent: string, actorId: string): Promise<RowResult[] | { success: boolean; count: number }> {
    const prep = await this.prepareAndValidate(companyId, csvContent);

    const hasAnyErrors = prep.results.some((r) => !r.valid);
    if (hasAnyErrors) {
      return prep.results; // Do not create anything, return errors
    }

    const membershipsToTrigger: string[] = [];
    const emailsToSend: Array<{ email: string; token: string }> = [];

    // All-or-nothing transaction
    await prisma.$transaction(async (tx) => {
      for (const data of prep.parsedRowsData) {
        // 1. Create the user
        const newUser = await tx.user.create({
          data: {
            email: data.email.toLowerCase().trim(),
            firstName: data.firstName || null,
            lastName: data.lastName || null,
            username: null,
            companyId,
            status: UserStatus.PENDING,
            roleId: data.matchedRole.id,
          },
        });

        // 2. Create Organization Unit Membership
        if (data.matchedOU) {
          const ouMembership = await tx.membership.create({
            data: {
              userId: newUser.id,
              organizationUnitId: data.matchedOU.id,
              membershipType: 'MEMBER',
              status: 'ACTIVE',
              source: 'HR_IMPORT',
              createdById: actorId,
            },
          });
          membershipsToTrigger.push(ouMembership.id);
        }

        // 3. Create Learning Group Memberships
        for (const g of data.matchedGroups) {
          const groupMembership = await tx.membership.create({
            data: {
              userId: newUser.id,
              learningGroupId: g.id,
              membershipType: 'MEMBER',
              status: 'ACTIVE',
              source: 'HR_IMPORT',
              createdById: actorId,
            },
          });
          membershipsToTrigger.push(groupMembership.id);
        }

        // 4. Create custom profile field values
        for (const cf of data.customFieldsData) {
          await tx.profileFieldValue.create({
            data: {
              userId: newUser.id,
              fieldDefinitionId: cf.fieldId,
              value: cf.value,
            },
          });
        }

        // 5. Generate Invitation Token inside transaction
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + INVITATION_TTL_SECONDS * 1000);

        // Invalidate any old invitation tokens
        await tx.token.updateMany({
          where: {
            userId: newUser.id,
            purpose: TokenPurpose.INVITATION,
            usedAt: null,
          },
          data: {
            usedAt: new Date(),
          },
        });

        // Save new invitation token
        await tx.token.create({
          data: {
            userId: newUser.id,
            tokenHash,
            purpose: TokenPurpose.INVITATION,
            expiresAt,
          },
        });

        emailsToSend.push({
          email: data.email.toLowerCase().trim(),
          token: rawToken,
        });
      }
    });

    // Transaction completed successfully. Run hooks and send invitation emails.
    for (const membershipId of membershipsToTrigger) {
      try {
        await membershipAssignmentHooksService.onMembershipCreated(membershipId);
      } catch (err) {
        console.error(`[BulkImport] Failed to run onMembershipCreated hook for membership ${membershipId}:`, err);
      }
    }

    for (const entry of emailsToSend) {
      try {
        await emailService.send(entry.email, 'invitation', {
          email: entry.email,
          token: entry.token,
        });
      } catch (err) {
        console.error(`[BulkImport] Failed to send invitation email to ${entry.email}:`, err);
      }
    }

    return {
      success: true,
      count: prep.parsedRowsData.length,
    };
  }
}

export const bulkImportService = new BulkImportService();
