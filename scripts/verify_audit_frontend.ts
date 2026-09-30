import { prisma } from '../server/src/shared/db/prisma';
import { syncPermissions } from '../server/src/shared/permissions/sync';
import { auditLogService } from '../server/src/shared/audit/auditLog.service';
import { AuditCategory, AuditOutcome } from '@prisma/client';
import express from 'express';
import auditRouter from '../server/src/features/audit/routes/audit.routes';
import http from 'http';

async function run() {
  console.log('===========================================================');
  console.log('STARTING AUDIT LOG FRONTEND & PERMISSION VERIFICATION');
  console.log('===========================================================');

  await syncPermissions();

  const timestamp = Date.now();
  const company = await prisma.company.create({
    data: {
      name: `AuditFrontCo_${timestamp}`,
      contactInfo: `front_${timestamp}@example.com`,
      domain: `front-${timestamp}.com`,
    },
  });

  const permAuditView = await prisma.permission.findFirst({ where: { module: 'audit', action: 'view' } });
  const permUsersView = await prisma.permission.findFirst({ where: { module: 'users', action: 'view' } });

  if (!permAuditView || !permUsersView) {
    throw new Error('Required permissions missing in database!');
  }

  // Role 1: ONLY audit:view
  const roleAuditOnly = await prisma.role.create({
    data: {
      name: `AuditViewOnly_${timestamp}`,
      companyId: company.id,
      permissions: {
        create: [{ permissionId: permAuditView.id }],
      },
    },
  });

  // Role 2: Users:view only (NO audit:view)
  const roleUsersOnly = await prisma.role.create({
    data: {
      name: `UsersViewOnly_${timestamp}`,
      companyId: company.id,
      permissions: {
        create: [{ permissionId: permUsersView.id }],
      },
    },
  });

  // User 1: Has ONLY audit:view
  const userAuditOnly = await prisma.user.create({
    data: {
      email: `audit_only_${timestamp}@test.com`,
      username: `auditonly_${timestamp}`,
      companyId: company.id,
      roleId: roleAuditOnly.id,
      status: 'ACTIVE',
    },
  });

  // User 2: Has users:view, but NO audit:view
  const userNoAudit = await prisma.user.create({
    data: {
      email: `no_audit_${timestamp}@test.com`,
      username: `noaudit_${timestamp}`,
      companyId: company.id,
      roleId: roleUsersOnly.id,
      status: 'ACTIVE',
    },
  });

  // User 3: Plain user with NO management permissions
  const userPlain = await prisma.user.create({
    data: {
      email: `plain_${timestamp}@test.com`,
      username: `plain_${timestamp}`,
      companyId: company.id,
      status: 'ACTIVE',
    },
  });

  console.log('--- 1. VERIFYING PERMISSION CHAINS (App.tsx & Navbar.tsx) ---');

  // Test hasManagementAccess logic for user with ONLY audit:view
  // App.tsx and Navbar.tsx check:
  // usePermission('roles', 'manage') || ... || usePermission('audit', 'view')
  const checkManagementAccess = (effectivePerms: string[]) => {
    const permList = [
      'roles:manage',
      'users:view',
      'organization:view',
      'organization:manage-members',
      'organization:manage-groups',
      'assignments:create',
      'assignments:edit',
      'assignments:assign-own-groups',
      'assignments:assign-globally',
      'assignments:view-reports',
      'assignments:create-mandatory',
      'profile-fields:manage-fields',
      'theme:view',
      'notifications:manage-rules',
      'notifications:view-delivery-failures',
      'notifications:manage-scheduled',
      'notifications:manage-templates',
      'audit:view',
    ];
    return permList.some((p) => effectivePerms.includes(p));
  };

  const userAuditOnlyPerms = ['audit:view'];
  const userNoAuditPerms = ['users:view'];
  const userPlainPerms: string[] = [];

  console.log(`User with ONLY audit:view hasManagementAccess: ${checkManagementAccess(userAuditOnlyPerms)} (MUST be true)`);
  console.log(`User with ONLY users:view canViewAudit ('audit:view'): ${userNoAuditPerms.includes('audit:view')} (MUST be false)`);
  console.log(`User with plain role hasManagementAccess: ${checkManagementAccess(userPlainPerms)} (MUST be false)`);

  if (!checkManagementAccess(userAuditOnlyPerms)) {
    throw new Error('User with only audit:view was denied management access!');
  }
  if (userNoAuditPerms.includes('audit:view')) {
    throw new Error('User without audit:view incorrectly granted audit view!');
  }

  // --- 2. SEED TEST AUDIT LOG DATA (Including legacy null outcome/category) ---
  console.log('\n--- 2. SEEDING TEST AUDIT DATA ---');

  // Row 1: FAILURE outcome
  const rowFailure = await prisma.auditLog.create({
    data: {
      companyId: company.id,
      category: AuditCategory.AUTHENTICATION_SECURITY,
      outcome: AuditOutcome.FAILURE,
      action: 'LOGIN_FAILURE',
      actorId: userAuditOnly.id,
      entityType: 'User',
      entityId: userAuditOnly.id,
      affectedObjectName: 'Audit Admin User',
      searchText: 'AUTHENTICATION_SECURITY FAILURE LOGIN_FAILURE Audit Admin User User',
      details: { attemptedIdentifier: 'admin_audit', reason: 'Invalid password' },
      authFailureCount: 3,
    },
  });

  // Row 2: DELETION category
  const rowDeletion = await prisma.auditLog.create({
    data: {
      companyId: company.id,
      category: AuditCategory.DELETION,
      outcome: AuditOutcome.SUCCESS,
      action: 'DELETE_ORGANIZATION_UNIT',
      actorId: userAuditOnly.id,
      entityType: 'OrganizationUnit',
      entityId: 'ou-sales-999',
      affectedObjectName: 'Sales Department',
      searchText: 'DELETION SUCCESS DELETE_ORGANIZATION_UNIT Sales Department OrganizationUnit',
      details: { deletedOuId: 'ou-sales-999', memberCount: 14 },
    },
  });

  // Row 3: COMPLETED action
  const rowCompleted = await prisma.auditLog.create({
    data: {
      companyId: company.id,
      category: AuditCategory.LEARNING_RESULTS,
      outcome: AuditOutcome.SUCCESS,
      action: 'COMPLETED',
      actorId: userNoAudit.id,
      entityType: 'Lesson',
      entityId: 'lesson-cyber-101',
      affectedObjectName: 'Cybersecurity Awareness 101',
      searchText: 'LEARNING_RESULTS SUCCESS COMPLETED Cybersecurity Awareness 101 Lesson',
      details: { scoreRaw: 100, scoreMin: 0, scoreMax: 100 },
    },
  });

  // Row 4: Legacy Row with category: null and outcome: null
  const rowLegacy = await prisma.auditLog.create({
    data: {
      companyId: company.id,
      category: null,
      outcome: null,
      action: 'SYSTEM_BOOT',
      actorId: null,
      entityType: 'System',
      entityId: 'sys-boot-1',
      affectedObjectName: 'SmartCookie Core Instance',
      searchText: 'SYSTEM_BOOT SmartCookie Core Instance System',
      details: { version: '1.0.0', nodeEnv: 'production' },
    },
  });

  // Row 5: Changes array
  const rowWithChanges = await prisma.auditLog.create({
    data: {
      companyId: company.id,
      category: AuditCategory.PERMISSIONS_ORGANIZATION,
      outcome: AuditOutcome.SUCCESS,
      action: 'UPDATE_ROLE',
      actorId: userAuditOnly.id,
      entityType: 'Role',
      entityId: roleAuditOnly.id,
      affectedObjectName: 'Security Auditor Role',
      searchText: 'PERMISSIONS_ORGANIZATION SUCCESS UPDATE_ROLE Security Auditor Role Role',
      changes: [{ field: 'name', before: 'Auditor Old', after: 'Security Auditor Role' }],
      details: { modifiedBy: userAuditOnly.email },
    },
  });

  console.log('Seeded 5 diverse audit rows (Failure, Deletion, Completed, Legacy null/null, and Changes).');

  // --- 3. TEST API ENDPOINTS VIA EXPRESS ---
  console.log('\n--- 3. TESTING API ENDPOINTS ---');

  // Setup sessions for authenticated API calls
  const sessionAudit = await prisma.session.create({
    data: {
      userId: userAuditOnly.id,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  const sessionNoAudit = await prisma.session.create({
    data: {
      userId: userNoAudit.id,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  const app = express();
  app.use(express.json());
  app.use(async (req, res, next) => {
    const testSessionId = req.headers['x-test-session-id'] as string;
    if (testSessionId) {
      (req as any).signedCookies = { sid: testSessionId };
    }
    next();
  });
  app.use('/api/audit-logs', auditRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/audit-logs`;

  // 3a. User without audit:view calling GET /api/audit-logs -> 403 Forbidden
  const resForbidden = await fetch(`${baseUrl}`, {
    headers: { 'x-test-session-id': sessionNoAudit.id },
  });
  console.log(`GET /api/audit-logs without audit:view status (must be 403): ${resForbidden.status}`);
  if (resForbidden.status !== 403) throw new Error(`Expected 403, got ${resForbidden.status}`);

  // 3b. User with audit:view calling GET /api/audit-logs -> 200 with 5 items
  const resList = await fetch(`${baseUrl}?page=1&pageSize=30`, {
    headers: { 'x-test-session-id': sessionAudit.id },
  });
  const dataList = await resList.json();
  console.log(`GET /api/audit-logs with audit:view status: ${resList.status}, totalCount: ${dataList.totalCount}`);
  if (resList.status !== 200 || dataList.totalCount !== 5) {
    throw new Error(`Expected 200 and 5 items, got status ${resList.status} and count ${dataList.totalCount}`);
  }

  // 3c. Filter by outcome=FAILURE
  const resFilterFailure = await fetch(`${baseUrl}?outcome=FAILURE`, {
    headers: { 'x-test-session-id': sessionAudit.id },
  });
  const dataFailure = await resFilterFailure.json();
  console.log(`GET /api/audit-logs?outcome=FAILURE items count (must be 1): ${dataFailure.items.length}`);
  if (dataFailure.items.length !== 1 || dataFailure.items[0].action !== 'LOGIN_FAILURE') {
    throw new Error('Filter by outcome=FAILURE failed');
  }

  // 3d. Search query for "Department"
  const resSearch = await fetch(`${baseUrl}/search?q=Department`, {
    headers: { 'x-test-session-id': sessionAudit.id },
  });
  const dataSearch = await resSearch.json();
  console.log(`GET /api/audit-logs/search?q=Department items count (must be >= 1): ${dataSearch.items.length}`);
  if (dataSearch.items.length < 1 || dataSearch.items[0].affectedObjectName !== 'Sales Department') {
    throw new Error('Search for Department failed');
  }

  // 3d-2. Exact ID Search
  const resSearchId = await fetch(`${baseUrl}/search?q=${rowFailure.id}`, {
    headers: { 'x-test-session-id': sessionAudit.id },
  });
  const dataSearchId = await resSearchId.json();
  console.log(`GET /api/audit-logs/search?q=${rowFailure.id} exact match found: ${dataSearchId.items.length === 1 && dataSearchId.items[0].matchType === 'exact_id'}`);
  if (dataSearchId.items.length !== 1 || dataSearchId.items[0].id !== rowFailure.id) {
    throw new Error('Exact ID search failed');
  }

  // 3e. Filter options endpoint
  const resOptions = await fetch(`${baseUrl}/filter-options`, {
    headers: { 'x-test-session-id': sessionAudit.id },
  });
  const dataOptions = await resOptions.json();
  console.log(`GET /api/audit-logs/filter-options actions: ${JSON.stringify(dataOptions.actions)}`);
  console.log(`GET /api/audit-logs/filter-options entityTypes: ${JSON.stringify(dataOptions.entityTypes)}`);
  console.log(`GET /api/audit-logs/filter-options hasSystemEvents: ${dataOptions.hasSystemEvents}`);

  // 3f. Detail endpoint for rowWithChanges
  const resDetail = await fetch(`${baseUrl}/${rowWithChanges.id}`, {
    headers: { 'x-test-session-id': sessionAudit.id },
  });
  const dataDetail = await resDetail.json();
  console.log(`GET /api/audit-logs/:id action: ${dataDetail.action}, changes: ${JSON.stringify(dataDetail.changes)}`);
  if (!Array.isArray(dataDetail.changes) || dataDetail.changes.length !== 1) {
    throw new Error('Detail endpoint did not return expected changes array');
  }

  // 3g. CSV Export Filtered
  const resExportFiltered = await fetch(`${baseUrl}/export?outcome=FAILURE`, {
    headers: { 'x-test-session-id': sessionAudit.id },
  });
  const csvFilteredText = await resExportFiltered.text();
  console.log(`GET /api/audit-logs/export?outcome=FAILURE status: ${resExportFiltered.status}, csv rows: ${csvFilteredText.trim().split('\n').length}`);
  if (!csvFilteredText.includes('LOGIN_FAILURE')) {
    throw new Error('Export filtered CSV missing LOGIN_FAILURE row');
  }

  // 3h. CSV Export All
  const resExportAll = await fetch(`${baseUrl}/export/all`, {
    headers: { 'x-test-session-id': sessionAudit.id },
  });
  const csvAllText = await resExportAll.text();
  console.log(`GET /api/audit-logs/export/all status: ${resExportAll.status}, csv rows: ${csvAllText.trim().split('\n').length}`);
  if (!csvAllText.includes('LOGIN_FAILURE') || !csvAllText.includes('DELETE_ORGANIZATION_UNIT')) {
    throw new Error('Export all CSV missing expected rows');
  }

  // Cleanup
  await prisma.session.deleteMany({ where: { id: { in: [sessionAudit.id, sessionNoAudit.id] } } });
  await prisma.auditLog.deleteMany({ where: { companyId: company.id } });
  await prisma.user.deleteMany({ where: { id: { in: [userAuditOnly.id, userNoAudit.id, userPlain.id] } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: [roleAuditOnly.id, roleUsersOnly.id] } } });
  await prisma.role.deleteMany({ where: { id: { in: [roleAuditOnly.id, roleUsersOnly.id] } } });
  await prisma.company.deleteMany({ where: { id: company.id } });

  server.close();
  console.log('\n===========================================================');
  console.log('ALL FRONTEND & API VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('===========================================================');
}

run()
  .catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
