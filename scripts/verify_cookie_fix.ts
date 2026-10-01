import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cookieSignature from 'cookie-signature';
import { prisma } from '../server/src/shared/db/prisma';
import { csrfProtection } from '../server/src/shared/middleware/csrf.middleware';
import setupRouter from '../server/src/features/auth/routes/setup.routes';
import authRouter from '../server/src/features/auth/routes/auth.routes';
import { SESSION_DURATION_MS } from '../server/src/shared/constants';

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 VERIFICATION: Cookies Outside HTTPS & Setup Wizard Walkthrough');
  console.log('================================================================\n');

  // Test 1: Diagnostic & Cookie Flag Resolution in Development vs Production
  console.log('--- TEST 1: Environment-aware cookie flag resolution ---');
  
  // A. Development / Non-Production
  delete process.env.NODE_ENV;
  const devApp = express();
  devApp.use(express.json());
  devApp.use(cookieParser('test-secret'));
  devApp.use('/api', csrfProtection);
  devApp.get('/api/test', (req, res) => res.json({ ok: true }));

  const devServer = devApp.listen(0);
  const devPort = (devServer.address() as any).port;

  const devResCookies: string[] = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${devPort}/api/test`, (res) => {
      resolve(res.headers['set-cookie'] || []);
    }).on('error', reject);
  });
  devServer.close();

  console.log('Development (NODE_ENV unset) Set-Cookie headers:');
  let devHasSecure = false;
  let devHasSameSiteLax = false;
  for (const c of devResCookies) {
    console.log('  ', c);
    if (/;\s*Secure/i.test(c)) devHasSecure = true;
    if (/;\s*SameSite=Lax/i.test(c)) devHasSameSiteLax = true;
  }
  console.log(`[Dev Check] Secure flag omitted: ${!devHasSecure}`);
  console.log(`[Dev Check] SameSite=Lax present: ${devHasSameSiteLax}`);
  if (devHasSecure || !devHasSameSiteLax) {
    throw new Error('Development cookie flags failed verification!');
  }

  // B. Production
  process.env.NODE_ENV = 'production';
  const prodApp = express();
  prodApp.use(express.json());
  prodApp.use(cookieParser('test-secret'));
  prodApp.use('/api', csrfProtection);
  prodApp.get('/api/test', (req, res) => res.json({ ok: true }));

  const prodServer = prodApp.listen(0);
  const prodPort = (prodServer.address() as any).port;

  const prodResCookies: string[] = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${prodPort}/api/test`, (res) => {
      resolve(res.headers['set-cookie'] || []);
    }).on('error', reject);
  });
  prodServer.close();

  console.log('\nProduction (NODE_ENV=production) Set-Cookie headers:');
  let prodHasSecure = true;
  let prodHasSameSiteNone = true;
  for (const c of prodResCookies) {
    console.log('  ', c);
    if (!/;\s*Secure/i.test(c)) prodHasSecure = false;
    if (!/;\s*SameSite=None/i.test(c)) prodHasSameSiteNone = false;
  }
  console.log(`[Prod Check] Secure flag present: ${prodHasSecure}`);
  console.log(`[Prod Check] SameSite=None present: ${prodHasSameSiteNone}`);
  if (!prodHasSecure || !prodHasSameSiteNone) {
    throw new Error('Production cookie flags failed verification!');
  }

  // Restore development for full walkthrough
  delete process.env.NODE_ENV;
  console.log('\n--- TEST 2: Setup Wizard Walkthrough & Mail-Config Skip over HTTP ---');

  const SESSION_SECRET = 'smartcookie-test-secret';
  const app = express();
  app.use(express.json());
  app.use(cookieParser(SESSION_SECRET));
  app.use('/api', csrfProtection);
  app.use('/api/setup', setupRouter);
  app.use('/api/auth', authRouter);

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Cookie jar simulation
  const cookieJar: Record<string, string> = {};

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

  async function makeRequest(path: string, options: { method: string; body?: any; headers?: Record<string, string> }) {
    const url = new URL(path, baseUrl);
    const headers: Record<string, string> = {
      ...options.headers,
      Cookie: getCookieHeader(),
    };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }>((resolve, reject) => {
      const req = http.request(url, {
        method: options.method,
        headers,
      }, (res) => {
        parseSetCookies(res.headers['set-cookie']);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {}
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: parsed,
          });
        });
      });

      req.on('error', reject);
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }

  // 1. Initial GET /api/setup/status -> sets csrfToken cookie
  console.log('\n1. Initial GET /api/setup/status:');
  const initialStatusRes = await makeRequest('/api/setup/status', { method: 'GET' });
  console.log(`   Status: ${initialStatusRes.status}, Body:`, initialStatusRes.body);
  console.log(`   Cookie Jar contents:`, Object.keys(cookieJar));
  if (!cookieJar.csrfToken) {
    throw new Error('csrfToken was not populated in cookie jar!');
  }
  const csrfToken = cookieJar.csrfToken;
  console.log(`   Obtained CSRF Token: ${csrfToken.substring(0, 10)}...`);

  // Ensure superuser exists and active session is created in DB for testing
  let superuser = await prisma.user.findFirst({ where: { isSuperuser: true } });
  let company = await prisma.company.findFirst();

  if (!superuser) {
    console.log('\n2. Creating initial superuser for wizard...');
    const suRes = await makeRequest('/api/setup/superuser', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: {
        username: `admin_${Date.now()}`,
        password: 'Password123!',
        recoveryEmail: `admin_${Date.now()}@test.corp`,
      },
    });
    console.log(`   Status: ${suRes.status}, sid cookie stored: ${!!cookieJar.sid}`);
    superuser = await prisma.user.findFirst({ where: { isSuperuser: true } });
  }

  if (!company && superuser) {
    console.log('\n3. Creating company...');
    if (!superuser.mfaEnabled) {
      await prisma.user.update({
        where: { id: superuser.id },
        data: { mfaEnabled: true },
      });
    }
    const compRes = await makeRequest('/api/setup/company', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: {
        name: 'SmartCookie Testing Corp',
        contactInfo: 'admin@smartcookie.corp',
      },
    });
    console.log(`   Company created. Status: ${compRes.status}`);
    company = await prisma.company.findFirst();
  }

  // Ensure superuser is tied to the primary company and has an active session
  if (company && superuser) {
    await prisma.user.update({
      where: { id: superuser.id },
      data: { companyId: company.id, mfaEnabled: true },
    });

    // Reset company wizard steps to test the Mail Config Skip button cleanly
    await prisma.company.update({
      where: { id: company.id },
      data: {
        mailConfigStepCompletedAt: null,
        identityProviderStepCompletedAt: null,
        setupCompletedAt: null,
        settings: {},
      },
    });

    let session = await prisma.session.findFirst({
      where: { userId: superuser.id, expiresAt: { gt: new Date() } },
    });
    if (!session) {
      session = await prisma.session.create({
        data: {
          userId: superuser.id,
          expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
        },
      });
    }
    const signedSid = 's:' + cookieSignature.sign(session.id, SESSION_SECRET);
    cookieJar['sid'] = signedSid;
    console.log(`   Active session loaded for superuser (${superuser.username}): sid=${session.id.substring(0, 8)}...`);
  }

  const currentStatusRes = await makeRequest('/api/setup/status', { method: 'GET' });
  console.log(`\n4. Setup status prior to Skip test: ${currentStatusRes.body.status}`);
  if (currentStatusRes.body.status !== 'mail-config') {
    throw new Error(`Expected setup status to be 'mail-config', got '${currentStatusRes.body.status}'`);
  }

  // Step 5: THE CRITICAL REGRESSION TEST - Skip Mail Config Step
  console.log('\n5. 👉 CRITICAL REGRESSION TEST: POST /api/setup/mail-config/skip');
  console.log(`   Submitting with X-CSRF-Token: ${csrfToken.substring(0, 10)}... and sid cookie`);
  const skipRes = await makeRequest('/api/setup/mail-config/skip', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
  console.log(`   Response Status: ${skipRes.status}`);
  console.log(`   Response Body:`, skipRes.body);

  if (skipRes.status !== 200 || !skipRes.body.success) {
    throw new Error(`Mail config skip failed! Expected status 200, got ${skipRes.status}: ${JSON.stringify(skipRes.body)}`);
  }
  console.log('   ✅ Mail config skip successfully returned HTTP 200!');

  // Check that status moved to identity-provider
  const afterMailSkipRes = await makeRequest('/api/setup/status', { method: 'GET' });
  console.log(`   Wizard status successfully advanced to: ${afterMailSkipRes.body.status}`);
  if (afterMailSkipRes.body.status !== 'identity-provider') {
    throw new Error(`Expected status 'identity-provider', got '${afterMailSkipRes.body.status}'`);
  }

  // Step 6: Test Identity Provider Skip
  console.log('\n6. POST /api/setup/identity-provider/skip:');
  const entraSkipRes = await makeRequest('/api/setup/identity-provider/skip', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
  console.log(`   Status: ${entraSkipRes.status}, Body:`, entraSkipRes.body);
  if (entraSkipRes.status !== 200) {
    throw new Error(`Identity provider skip failed with status ${entraSkipRes.status}`);
  }

  // Step 7: Org Structure
  console.log('\n7. POST /api/setup/org-structure:');
  const orgRes = await makeRequest('/api/setup/org-structure', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: { ouNames: ['Engineering', 'Marketing', 'Customer Support'] },
  });
  console.log(`   Status: ${orgRes.status}, Body:`, orgRes.body);
  if (orgRes.status !== 200) {
    throw new Error(`Org structure step failed with status ${orgRes.status}`);
  }

  // Step 8: Role Templates
  console.log('\n8. POST /api/setup/role-templates:');
  const rtRes = await makeRequest('/api/setup/role-templates', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: { selectedNames: ['LMS Manager', 'Content Creator', 'Learner'] },
  });
  console.log(`   Status: ${rtRes.status}, Body:`, rtRes.body);
  if (rtRes.status !== 200) {
    throw new Error(`Role templates step failed with status ${rtRes.status}`);
  }

  // Step 9: Final status verification
  const finalStatusRes = await makeRequest('/api/setup/status', { method: 'GET' });
  console.log(`\n9. Final Wizard Status: ${finalStatusRes.status} (Body: ${JSON.stringify(finalStatusRes.body)})`);
  if (finalStatusRes.status !== 403 && finalStatusRes.body.status !== 'complete') {
    throw new Error(`Expected setup to be complete (HTTP 403 or status 'complete'), got ${finalStatusRes.status}`);
  }
  console.log('   ✅ Setup Wizard completed 100%!');

  // Step 10: Test CSRF Protection Rejection (Invalid / Missing CSRF token)
  console.log('\n10. Testing CSRF Rejection on invalid token:');
  const csrfFailRes = await makeRequest('/api/auth/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': 'invalid-token-12345' },
  });
  console.log(`   Status with invalid CSRF token: ${csrfFailRes.status} (Expected: 403)`);
  if (csrfFailRes.status !== 403) {
    throw new Error(`Expected CSRF mismatch to return 403, got ${csrfFailRes.status}`);
  }
  console.log('   ✅ CSRF Protection properly rejected invalid token with HTTP 403!');

  server.close();
  console.log('\n🎉 ALL VERIFICATION TESTS COMPLETED AND PASSED PERFECTLY!');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
