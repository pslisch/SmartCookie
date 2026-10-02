/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cookieSignature from 'cookie-signature';
import { prisma } from '../server/src/shared/db/prisma';
import { syncPermissions } from '../server/src/shared/permissions/sync';
import { csrfProtection } from '../server/src/shared/middleware/csrf.middleware';
import auditRouter from '../server/src/features/audit/routes/audit.routes';
import { AuditLog } from '../src/features/audit/pages/AuditLog';
import { AuditLogSettings } from '../src/features/audit/pages/AuditLogSettings';
import { AuditLogView } from '../src/features/audit/pages/AuditLogView';
import { PreviewContext } from '../src/shared/contexts/PreviewContext';
import { AuthContext } from '../src/shared/components/AppGate';

// Mock AuthContext & useAuth for component-level testing
let mockUserIdentity: any = null;
let mockPreviewContext: any = null;

// Mock react-i18next so translations render accurately
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../src/shared/i18n/locales/en/common.json';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: enCommon,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

// Mock AppGate useAuth hook
jest_or_module_mock: {
  // We can wrap component inside mock PreviewProvider or test with explicit context
}

async function runAuditSettingsVerification() {
  console.log('================================================================');
  console.log('🧪 VERIFICATION: Audit Log Settings Sub-Tab & Permission Gating');
  console.log('================================================================\n');

  await syncPermissions();

  // Find or create test company and superuser
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'AuditSettingsTestCo',
        contactInfo: 'admin@auditsettings.corp',
      },
    });
  }

  let superuser = await prisma.user.findFirst({ where: { isSuperuser: true } });
  if (!superuser) {
    superuser = await prisma.user.create({
      data: {
        username: 'audit_su',
        passwordHash: 'dummy',
        isSuperuser: true,
        companyId: company.id,
        recoveryEmail: 'audit_su@example.com',
        status: 'ACTIVE',
      },
    });
  } else if (!superuser.companyId) {
    await prisma.user.update({
      where: { id: superuser.id },
      data: { companyId: company.id },
    });
  }

  // -------------------------------------------------------------------------
  // SECTION 1: COMPONENT-LEVEL TAB RENDERING & INDEPENDENT PERMISSION GATING
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: Component-Level Permission Gating & Tab Fallback ---');

  const mockAuthValue = {
    user: {
      id: 'test_user_id',
      username: 'test_user',
      isSuperuser: false,
      recoveryEmail: 'test@example.com',
      companyId: 'test_company_id',
      status: 'ACTIVE',
      roleName: 'Test Role',
      effectivePermissions: [],
    },
    setupStatus: 'complete' as const,
    isLoading: false,
    refresh: async () => {},
    logout: async () => {},
  };

  // Helper to render AuditLog with custom user permissions
  const renderAuditLogWithPermissions = (permissions: string[], isSuperuser = false) => {
    // We simulate PreviewContext where previewRoleId !== null so isSuperuser bypass is suspended
    // and previewEffectivePermissions strictly dictates usePermission return values!
    const previewValue = {
      previewRoleId: 'role_test',
      previewRoleName: 'Test Role',
      previewEffectivePermissions: permissions,
      isApplying: false,
      applyRole: async () => {},
      clearPreview: () => {},
    };

    return ReactDOMServer.renderToStaticMarkup(
      <AuthContext.Provider value={mockAuthValue}>
        <PreviewContext.Provider value={previewValue}>
          <AuditLog />
        </PreviewContext.Provider>
      </AuthContext.Provider>
    );
  };

  // Case A: User with ONLY audit:view (no manage-retention)
  console.log('\n[Case A] Testing User with ONLY audit:view:');
  const htmlViewOnly = renderAuditLogWithPermissions(['audit:view']);
  const hasLogTabA = htmlViewOnly.includes('id="tab-btn-log"');
  const hasSettingsTabA = htmlViewOnly.includes('id="tab-btn-settings"');
  console.log(` - "Log" tab button rendered: ${hasLogTabA} (Expected: true)`);
  console.log(` - "Settings" tab button rendered: ${hasSettingsTabA} (Expected: false)`);
  if (!hasLogTabA || hasSettingsTabA) {
    throw new Error('Case A Failed: User with only audit:view must see Log tab and NOT Settings tab button!');
  }
  console.log(' ✅ Case A passed: Settings tab button does not render at all (not just disabled).');

  // Case B: User with ONLY audit:manage-retention (no audit:view)
  console.log('\n[Case B] Testing User with ONLY audit:manage-retention:');
  const htmlRetentionOnly = renderAuditLogWithPermissions(['audit:manage-retention']);
  const hasLogTabB = htmlRetentionOnly.includes('id="tab-btn-log"');
  const hasSettingsTabB = htmlRetentionOnly.includes('id="tab-btn-settings"');
  const hasSettingsMountedB =
    htmlRetentionOnly.includes('id="audit-settings-loading"') ||
    htmlRetentionOnly.includes('id="audit-settings-page"');
  const hasLogViewMountedB = htmlRetentionOnly.includes('id="audit-log-view-page"');
  console.log(` - "Log" tab button rendered: ${hasLogTabB} (Expected: false)`);
  console.log(` - "Settings" tab button rendered: ${hasSettingsTabB} (Expected: true)`);
  console.log(` - Settings tab active by default via getFirstPermittedTab: ${hasSettingsMountedB && !hasLogViewMountedB} (Expected: true)`);
  if (hasLogTabB || !hasSettingsTabB || !hasSettingsMountedB || hasLogViewMountedB) {
    throw new Error('Case B Failed: User with only audit:manage-retention must see Settings tab, NOT Log tab, and land on Settings!');
  }
  console.log(' ✅ Case B passed: User lands on Settings by default without landing on blank Log tab.');

  // Case C: User with BOTH audit:view AND audit:manage-retention
  console.log('\n[Case C] Testing User with BOTH audit:view and audit:manage-retention:');
  const htmlBoth = renderAuditLogWithPermissions(['audit:view', 'audit:manage-retention']);
  const hasLogTabC = htmlBoth.includes('id="tab-btn-log"');
  const hasSettingsTabC = htmlBoth.includes('id="tab-btn-settings"');
  console.log(` - "Log" tab button rendered: ${hasLogTabC} (Expected: true)`);
  console.log(` - "Settings" tab button rendered: ${hasSettingsTabC} (Expected: true)`);
  if (!hasLogTabC || !hasSettingsTabC) {
    throw new Error('Case C Failed: User with both permissions must see both tab buttons!');
  }
  console.log(' ✅ Case C passed: User with both permissions sees both tab buttons.');

  // Case D: User with NEITHER permission
  console.log('\n[Case D] Testing User with NEITHER permission:');
  const htmlNeither = renderAuditLogWithPermissions([]);
  const hasNeitherUnauthorized = htmlNeither.includes('id="audit-hub-unauthorized"');
  const hasAnyTabD = htmlNeither.includes('id="audit-tabs"');
  console.log(` - Unauthorized banner displayed: ${hasNeitherUnauthorized} (Expected: true)`);
  console.log(` - Tab bar rendered: ${hasAnyTabD} (Expected: false)`);
  if (!hasNeitherUnauthorized || hasAnyTabD) {
    throw new Error('Case D Failed: User with neither permission must see unauthorized message and no tabs!');
  }
  console.log(' ✅ Case D passed: Protected against unauthorized access.');

  // Case E: AuditLogSettings Component Structure Verification
  console.log('\n[Case E] Testing AuditLogSettings Component Structure:');
  const previewRetention = {
    previewRoleId: 'role_test',
    previewRoleName: 'Test Role',
    previewEffectivePermissions: ['audit:manage-retention'],
    isApplying: false,
    applyRole: async () => {},
    clearPreview: () => {},
  };
  const htmlSettings = ReactDOMServer.renderToStaticMarkup(
    <AuthContext.Provider value={mockAuthValue}>
      <PreviewContext.Provider value={previewRetention}>
        <AuditLogSettings initialData={{ retentionDays: 365, failureAlertRecipients: ['alerts@test.com'] }} />
      </PreviewContext.Provider>
    </AuthContext.Provider>
  );
  const hasRetentionCard = htmlSettings.includes('id="retention-period-card"');
  const hasFailureAlertsCard = htmlSettings.includes('id="failure-alerts-card"');
  const hasSaveBtn = htmlSettings.includes('id="audit-settings-save-btn"');
  console.log(` - Retention period card present: ${hasRetentionCard}`);
  console.log(` - Failure alerts card present: ${hasFailureAlertsCard}`);
  console.log(` - Save button present: ${hasSaveBtn}`);
  if (!hasRetentionCard || !hasFailureAlertsCard || !hasSaveBtn) {
    throw new Error('Case E Failed: AuditLogSettings structure incomplete!');
  }
  console.log(' ✅ Case E passed: AuditLogSettings UI components properly structured.');

  // -------------------------------------------------------------------------
  // SECTION 2: REAL API GET/PATCH ROUND-TRIP & SERVER VALIDATION TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Real API GET/PATCH Round-Trip & Validation ---');

  const SESSION_SECRET = 'audit-settings-secret';
  const app = express();
  app.use(express.json());
  app.use(cookieParser(SESSION_SECRET));

  // User session middleware to simulate logged in user with companyId
  app.use((req, res, next) => {
    (req as any).user = superuser;
    next();
  });

  app.use('/api', csrfProtection);
  app.use('/api/audit-logs', auditRouter);

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const cookieJar: Record<string, string> = {};

  // Create or retrieve active session for superuser
  let session = await prisma.session.findFirst({
    where: { userId: superuser.id, expiresAt: { gt: new Date() } },
  });
  if (!session) {
    session = await prisma.session.create({
      data: {
        userId: superuser.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  }
  const signedSid = 's:' + cookieSignature.sign(session.id, SESSION_SECRET);
  cookieJar.sid = signedSid;

  function parseSetCookies(setCookieHeaders?: string[]) {
    if (!setCookieHeaders) return;
    for (const header of setCookieHeaders) {
      const parts = header.split(';');
      const [nameVal] = parts;
      const eqIdx = nameVal.indexOf('=');
      if (eqIdx !== -1) {
        const name = nameVal.substring(0, eqIdx).trim();
        const val = nameVal.substring(eqIdx + 1).trim();
        cookieJar[name] = val;
      }
    }
  }

  function getCookieHeader(): string {
    return Object.entries(cookieJar)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async function apiCall(path: string, options: { method: string; body?: any; headers?: Record<string, string> }) {
    const url = new URL(path, baseUrl);
    const headers: Record<string, string> = {
      ...options.headers,
      Cookie: getCookieHeader(),
    };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    return new Promise<{ status: number; body: any }>((resolve, reject) => {
      const req = http.request(url, { method: options.method, headers }, (res) => {
        parseSetCookies(res.headers['set-cookie']);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {}
          resolve({ status: res.statusCode || 0, body: parsed });
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }

  // 1. Initial GET /api/audit-logs/settings to establish CSRF cookie
  console.log('\n1. GET /api/audit-logs/settings (Initial load):');
  const getInitialRes = await apiCall('/api/audit-logs/settings', { method: 'GET' });
  console.log(`   Status: ${getInitialRes.status}, Body:`, getInitialRes.body);
  if (getInitialRes.status !== 200) {
    throw new Error(`Initial GET /settings failed with status ${getInitialRes.status}`);
  }
  const csrfToken = cookieJar.csrfToken;
  console.log(`   Acquired CSRF token: ${csrfToken ? csrfToken.substring(0, 10) + '...' : 'none'}`);

  // 2. Test Invalid retentionDays = 0 (Should reject with 400)
  console.log('\n2. PATCH /api/audit-logs/settings with retentionDays: 0 (Zero):');
  const patchZeroRes = await apiCall('/api/audit-logs/settings', {
    method: 'PATCH',
    headers: { 'X-CSRF-Token': csrfToken },
    body: { retentionDays: 0 },
  });
  console.log(`   Status: ${patchZeroRes.status} (Expected: 400), Error:`, patchZeroRes.body.error);
  if (patchZeroRes.status !== 400 || !patchZeroRes.body.error.includes('positive integer')) {
    throw new Error('Failed to reject retentionDays: 0 with 400!');
  }
  console.log('   ✅ Backend properly 400s on retentionDays: 0.');

  // 3. Test Invalid retentionDays = -30 (Negative)
  console.log('\n3. PATCH /api/audit-logs/settings with retentionDays: -30 (Negative):');
  const patchNegRes = await apiCall('/api/audit-logs/settings', {
    method: 'PATCH',
    headers: { 'X-CSRF-Token': csrfToken },
    body: { retentionDays: -30 },
  });
  console.log(`   Status: ${patchNegRes.status} (Expected: 400), Error:`, patchNegRes.body.error);
  if (patchNegRes.status !== 400 || !patchNegRes.body.error.includes('positive integer')) {
    throw new Error('Failed to reject retentionDays: -30 with 400!');
  }
  console.log('   ✅ Backend properly 400s on negative retentionDays.');

  // 4. Test Invalid Email in failureAlertRecipients
  console.log('\n4. PATCH /api/audit-logs/settings with invalid recipient string:');
  const patchBadEmailRes = await apiCall('/api/audit-logs/settings', {
    method: 'PATCH',
    headers: { 'X-CSRF-Token': csrfToken },
    body: { failureAlertRecipients: ['valid@example.com', 'invalid-email-address'] },
  });
  console.log(`   Status: ${patchBadEmailRes.status} (Expected: 400), Error:`, patchBadEmailRes.body.error);
  if (patchBadEmailRes.status !== 400 || !patchBadEmailRes.body.error.includes('Invalid email address')) {
    throw new Error('Failed to reject invalid recipient with 400!');
  }
  console.log('   ✅ Backend properly 400s on invalid recipient email format.');

  // 5. Test Valid PATCH with new retentionDays and recipients
  console.log('\n5. Valid PATCH /api/audit-logs/settings with retentionDays: 180 and 2 recipients:');
  const patchValidRes = await apiCall('/api/audit-logs/settings', {
    method: 'PATCH',
    headers: { 'X-CSRF-Token': csrfToken },
    body: {
      retentionDays: 180,
      failureAlertRecipients: ['alerts-ops@example.com', 'security-lead@example.com'],
    },
  });
  console.log(`   Status: ${patchValidRes.status}, Body:`, patchValidRes.body);
  if (patchValidRes.status !== 200 || patchValidRes.body.retentionDays !== 180 || patchValidRes.body.failureAlertRecipients.length !== 2) {
    throw new Error('Failed valid PATCH /settings!');
  }
  console.log('   ✅ PATCH successfully returned updated values.');

  // 6. Test GET /api/audit-logs/settings to prove database persistence
  console.log('\n6. Follow-up GET /api/audit-logs/settings (Verifying persistence):');
  const getFollowUpRes = await apiCall('/api/audit-logs/settings', { method: 'GET' });
  console.log(`   Status: ${getFollowUpRes.status}, Body:`, getFollowUpRes.body);
  if (
    getFollowUpRes.status !== 200 ||
    getFollowUpRes.body.retentionDays !== 180 ||
    !getFollowUpRes.body.failureAlertRecipients.includes('alerts-ops@example.com') ||
    !getFollowUpRes.body.failureAlertRecipients.includes('security-lead@example.com')
  ) {
    throw new Error('Persistence verification failed! Settings were not saved in database.');
  }
  console.log('   ✅ Confirmed persistence: GET /settings reflects newly saved settings.');

  // 7. Test removing a recipient and updating retentionDays again
  console.log('\n7. PATCH /api/audit-logs/settings (Removing 1 recipient, updating retentionDays to 90):');
  const patchRemoveRes = await apiCall('/api/audit-logs/settings', {
    method: 'PATCH',
    headers: { 'X-CSRF-Token': csrfToken },
    body: {
      retentionDays: 90,
      failureAlertRecipients: ['security-lead@example.com'],
    },
  });
  console.log(`   Status: ${patchRemoveRes.status}, Body:`, patchRemoveRes.body);
  if (
    patchRemoveRes.status !== 200 ||
    patchRemoveRes.body.retentionDays !== 90 ||
    patchRemoveRes.body.failureAlertRecipients.length !== 1 ||
    patchRemoveRes.body.failureAlertRecipients[0] !== 'security-lead@example.com'
  ) {
    throw new Error('Failed to update settings with removed recipient!');
  }

  // 8. Re-verify via GET
  const getFinalRes = await apiCall('/api/audit-logs/settings', { method: 'GET' });
  console.log('\n8. Final GET /api/audit-logs/settings:', getFinalRes.body);
  if (getFinalRes.body.retentionDays !== 90 || getFinalRes.body.failureAlertRecipients.length !== 1) {
    throw new Error('Final GET check failed!');
  }
  console.log('   ✅ Final GET confirms updated recipient list.');

  server.close();
  console.log('\n🎉 ALL AUDIT LOG SETTINGS VERIFICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runAuditSettingsVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
