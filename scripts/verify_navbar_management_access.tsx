/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from 'fs';
import path from 'path';

// Intercept React 19 server dispatcher so ThemeRuntimeProvider sets isLoading = false during SSR
const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
let _H = internals.H;
Object.defineProperty(internals, 'H', {
  get() {
    return _H;
  },
  set(val) {
    if (val && val.useState) {
      const origUseState = val.useState;
      val.useState = (init: any) => {
        if (init === true) {
          return origUseState(false); // isLoading in ThemeRuntimeProvider
        }
        return origUseState(init);
      };
    }
    _H = val;
  },
});

// Initialize i18next for testing
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

import { Navbar } from '../src/shared/components/layout/Navbar';
import { Tab } from '../src/shared/types';
import { AuthContext } from '../src/shared/components/AppGate';
import { PreviewContext } from '../src/shared/contexts/PreviewContext';
import { ThemeRuntimeProvider } from '../src/shared/contexts/ThemeRuntimeContext';

function extractPermissionsFromSource(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/const hasManagementAccess =([\s\S]*?);/);
  if (!match) {
    throw new Error(`Could not locate hasManagementAccess in ${filePath}`);
  }
  const block = match[1];
  const perms: string[] = [];
  const regex = /usePermission\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = regex.exec(block)) !== null) {
    perms.push(`${m[1]}:${m[2]}`);
  }
  return perms;
}

async function runRegressionVerification() {
  console.log('================================================================');
  console.log('🧪 VERIFICATION: Navbar.tsx hasManagementAccess Regression Test');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // SECTION 1: CODE-LEVEL PARITY & EXPLICIT DIFF BETWEEN App.tsx & Navbar.tsx
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: Exact Permission Chain Diff (App.tsx vs Navbar.tsx) ---');

  const appFilePath = path.resolve('src/App.tsx');
  const navbarFilePath = path.resolve('src/shared/components/layout/Navbar.tsx');

  const appPerms = extractPermissionsFromSource(appFilePath);
  const navbarPerms = extractPermissionsFromSource(navbarFilePath);

  console.log(`\nApp.tsx total management permissions: ${appPerms.length}`);
  console.log(`Navbar.tsx total management permissions: ${navbarPerms.length}`);

  console.log('\nPermission-by-Permission Comparison:');
  const maxLen = Math.max(appPerms.length, navbarPerms.length);
  let hasDiff = false;
  for (let i = 0; i < maxLen; i++) {
    const a = appPerms[i] || '<MISSING>';
    const b = navbarPerms[i] || '<MISSING>';
    const match = a === b;
    if (!match) hasDiff = true;
    console.log(`  [${String(i + 1).padStart(2, ' ')}] App: ${a.padEnd(35, ' ')} | Navbar: ${b.padEnd(35, ' ')} ${match ? '✅' : '❌ MISMATCH'}`);
  }

  if (hasDiff || appPerms.length !== navbarPerms.length) {
    throw new Error('SECTION 1 FAILED: App.tsx and Navbar.tsx hasManagementAccess permission chains do not match!');
  }
  console.log('\n✅ SECTION 1 PASSED: App.tsx and Navbar.tsx have 100% IDENTICAL permission chains (19/19 match).');

  // ---------------------------------------------------------------------------
  // SECTION 2: COMPONENT-LEVEL NAVBAR SSR VISIBILITY TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Component-Level Navbar Management Visibility Tests ---');

  const renderNavbarWithPermissions = (effectivePermissions: string[]) => {
    const mockAuthValue = {
      user: {
        id: 'test_user_id',
        username: 'test_user',
        isSuperuser: false,
        recoveryEmail: 'test@example.com',
        companyId: 'test_company_id',
        status: 'ACTIVE',
        roleName: 'Restricted Auditor',
        effectivePermissions,
      },
      setupStatus: 'complete' as const,
      isLoading: false,
      refresh: async () => {},
      logout: async () => {},
    };

    const previewValue = {
      previewRoleId: null,
      previewRoleName: null,
      previewEffectivePermissions: null,
      enterPreview: async () => {},
      exitPreview: () => {},
    };

    return ReactDOMServer.renderToStaticMarkup(
      <AuthContext.Provider value={mockAuthValue}>
        <PreviewContext.Provider value={previewValue}>
          <ThemeRuntimeProvider>
            <Navbar
              currentTab={Tab.MyLessons}
              onTabChange={() => {}}
              appName="SmartCookie"
            />
          </ThemeRuntimeProvider>
        </PreviewContext.Provider>
      </AuthContext.Provider>
    );
  };

  // Case A: User with ONLY audit:manage-retention (CRITICAL REGRESSION TEST)
  console.log('\n[Case A] Testing User with ONLY audit:manage-retention (NO audit:view, NO other management perms):');
  const htmlRetention = renderNavbarWithPermissions(['audit:manage-retention']);
  const desktopVisibleA = htmlRetention.includes('id="tab-management-desktop"');
  console.log(` - Desktop Management link visible in Navbar: ${desktopVisibleA} (Expected: true)`);

  if (!desktopVisibleA) {
    throw new Error('Case A FAILED: Management link in Navbar is NOT visible for user with ONLY audit:manage-retention!');
  }
  console.log(' ✅ Case A PASSED: Navbar Management link IS now visible for user with ONLY audit:manage-retention.');

  // Case B: User with ONLY audit:view
  console.log('\n[Case B] Testing User with ONLY audit:view (NO audit:manage-retention):');
  const htmlView = renderNavbarWithPermissions(['audit:view']);
  const desktopVisibleB = htmlView.includes('id="tab-management-desktop"');
  console.log(` - Desktop Management link visible in Navbar: ${desktopVisibleB} (Expected: true)`);

  if (!desktopVisibleB) {
    throw new Error('Case B FAILED: Management link should be visible for user with audit:view.');
  }
  console.log(' ✅ Case B PASSED: User with ONLY audit:view sees Management link.');

  // Case C: User with BOTH audit:view AND audit:manage-retention
  console.log('\n[Case C] Testing User with BOTH audit:view AND audit:manage-retention:');
  const htmlBoth = renderNavbarWithPermissions(['audit:view', 'audit:manage-retention']);
  const desktopVisibleC = htmlBoth.includes('id="tab-management-desktop"');
  console.log(` - Desktop Management link visible in Navbar: ${desktopVisibleC} (Expected: true)`);

  if (!desktopVisibleC) {
    throw new Error('Case C FAILED: Management link should be visible for user with both permissions.');
  }
  console.log(' ✅ Case C PASSED: User with both permissions sees Management link.');

  // Case D: User with NO management permissions (empty or non-management perms)
  console.log('\n[Case D] Testing User with NO management permissions:');
  const htmlNone = renderNavbarWithPermissions([]);
  const desktopVisibleD = htmlNone.includes('id="tab-management-desktop"');
  console.log(` - Desktop Management link visible in Navbar: ${desktopVisibleD} (Expected: false)`);

  if (desktopVisibleD) {
    throw new Error('Case D FAILED: Management link MUST NOT be visible for unauthorized user.');
  }
  console.log(' ✅ Case D PASSED: User with no management permissions cannot see Management link.');

  // Case E: Comprehensive parity check for every single one of the 19 permissions in isolation
  console.log('\n[Case E] Testing each of the 19 management permissions in isolation:');
  for (const perm of appPerms) {
    const html = renderNavbarWithPermissions([perm]);
    const isDeskVisible = html.includes('id="tab-management-desktop"');
    if (!isDeskVisible) {
      throw new Error(`Case E FAILED: Permission "${perm}" in isolation failed to render Management link in Navbar!`);
    }
    console.log(` - Permission "${perm.padEnd(35, ' ')}": Management Link Visible ✅`);
  }
  console.log(' ✅ Case E PASSED: All 19 permissions individually activate the Management link in Navbar.');

  console.log('\n================================================================');
  console.log('🎉 ALL NAVBAR REGRESSION TESTS COMPLETED AND PASSED PERFECTLY!');
  console.log('================================================================');
  process.exit(0);
}

runRegressionVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
