# Verification Evidence: Cookies Outside HTTPS & Setup Wizard Walkthrough

## 1. Initial Diagnostic Findings

### 1.1 Environment & Protocol Analysis
- **Development Runtime Environment**: The local development server runs on `http://localhost:3000` (or `http://127.0.0.1:3000`) with `process.env.NODE_ENV` defaulting to `development` (or unset).
- **Hardcoded Flags Pre-Fix**:
  - `server/src/shared/middleware/csrf.middleware.ts` (lines 25-26, 31-32): unconditionally set `secure: true` and `sameSite: 'none'`.
  - `server/src/features/auth/services/sessionHelper.ts` (line 28, 31): unconditionally set `secure: true` and `sameSite: 'none'`.
  - `server/src/features/auth/routes/auth.routes.ts` (lines 249, 252, 373, 376, 577, 580, 766, 769): unconditionally set `secure: true` and `sameSite: 'none'`.
  - `server/src/features/auth/routes/setup.routes.ts` (lines 66, 69): unconditionally set `secure: true` and `sameSite: 'none'`.

### 1.2 Root Cause Confirmation
- **Browser Cookie Rejection**: Per RFC 6265bis and browser security standards, user agents refuse to store or transmit cookies marked `Secure` when connecting over plain `http://`.
- **Pre-Fix Impact**:
  1. `document.cookie` remained empty string `""` on GET requests because the browser rejected storing `csrfToken=...; Secure; SameSite=None`.
  2. `getCookie('csrfToken')` returned `""` on subsequent mutation requests.
  3. When clicking "Skip" on the Setup Wizard's Mail Config step (`POST /api/setup/mail-config/skip`), the request lacked the valid `X-CSRF-Token` header and the `sid` cookie.
  4. The server's `csrfProtection` middleware rejected state-changing requests with HTTP 403 (`Forbidden: CSRF token mismatch or missing.`) or 401 (`Unauthorized: No active session.`), preventing the wizard from advancing.

---

## 2. Implementation Summary

All 8 `res.cookie` call sites were updated to use environment-aware cookie attributes matching the repository convention `process.env.NODE_ENV === 'production'`:
- **Production (`NODE_ENV === 'production'`)**: `secure: true`, `sameSite: 'none'` (preserves existing behavior for cross-site / iframe / HTTPS contexts).
- **Non-Production (`NODE_ENV !== 'production'`)**: `secure: false`, `sameSite: 'lax'` (allows cookie persistence over plain HTTP while providing standard same-site protection).

### Files Modified:
1. `server/src/shared/middleware/csrf.middleware.ts`:
   - `res.cookie('csrfToken', token, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/' })`
   - `res.cookie('XSRF-TOKEN', token, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/' })`
2. `server/src/features/auth/services/sessionHelper.ts`:
   - `res.cookie('sid', session.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', signed: true, expires: expiresAt, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' })`
3. `server/src/features/auth/routes/auth.routes.ts`:
   - Line ~247 (`POST /mfa/verify`): updated `sid` cookie flags.
   - Line ~371 (`POST /mfa/enable-pending`): updated `sid` cookie flags.
   - Line ~575 (`POST /activate`): updated `sid` cookie flags.
   - Line ~764 (`POST /reset-password`): updated `sid` cookie flags.
4. `server/src/features/auth/routes/setup.routes.ts`:
   - Line ~64 (`POST /superuser`): updated `sid` cookie flags.

---

## 3. Verification & Test Execution Results

### 3.1 Cookie Flag Verification Output (`npx tsx scripts/verify_cookie_fix.ts`)

```
================================================================
🧪 VERIFICATION: Cookies Outside HTTPS & Setup Wizard Walkthrough
================================================================

--- TEST 1: Environment-aware cookie flag resolution ---
Development (NODE_ENV unset) Set-Cookie headers:
   csrfToken=a01f5e681b9b3ab828e804772c87296647401f4b61fde4ca; Path=/; SameSite=Lax
   XSRF-TOKEN=a01f5e681b9b3ab828e804772c87296647401f4b61fde4ca; Path=/; SameSite=Lax
[Dev Check] Secure flag omitted: true
[Dev Check] SameSite=Lax present: true

Production (NODE_ENV=production) Set-Cookie headers:
   csrfToken=c5399ab6aee2799fa323b0b24a26dabe8bb007d133a5b446; Path=/; Secure; SameSite=None
   XSRF-TOKEN=c5399ab6aee2799fa323b0b24a26dabe8bb007d133a5b446; Path=/; Secure; SameSite=None
[Prod Check] Secure flag present: true
[Prod Check] SameSite=None present: true

--- TEST 2: Setup Wizard Walkthrough & Mail-Config Skip over HTTP ---

1. Initial GET /api/setup/status:
   Status: 200, Body: { status: 'mail-config' }
   Cookie Jar contents: [ 'csrfToken', 'XSRF-TOKEN' ]
   Obtained CSRF Token: 89edbcef39...
   Active session loaded for superuser (admin): sid=016d652f...

4. Setup status prior to Skip test: mail-config

5. 👉 CRITICAL REGRESSION TEST: POST /api/setup/mail-config/skip
   Submitting with X-CSRF-Token: 89edbcef39... and sid cookie
   Response Status: 200
   Response Body: { success: true }
   ✅ Mail config skip successfully returned HTTP 200!
   Wizard status successfully advanced to: identity-provider

6. POST /api/setup/identity-provider/skip:
   Status: 200, Body: { success: true }

7. POST /api/setup/org-structure:
   Status: 200, Body: {
     success: true,
     company: {
       id: '07fd9230-f0d7-4310-ac0b-12cb76a60434',
       name: 'UnclassifiedTestCo_1790773192395',
       contactInfo: 'unclass_1790773192395@example.com',
       setupCompletedAt: null
     }
   }

8. POST /api/setup/role-templates:
   Status: 200, Body: {
     success: true,
     company: {
       id: '07fd9230-f0d7-4310-ac0b-12cb76a60434',
       name: 'UnclassifiedTestCo_1790773192395',
       contactInfo: 'unclass_1790773192395@example.com',
       setupCompletedAt: '2026-10-01T07:12:49.977Z'
     }
   }

9. Final Wizard Status: 403 (Body: {"error":"Setup is already complete."})
   ✅ Setup Wizard completed 100%!

10. Testing CSRF Rejection on invalid token:
CSRF mismatch: cookieToken=true, headerToken=true, bodyToken=false
   Status with invalid CSRF token: 403 (Expected: 403)
   ✅ CSRF Protection properly rejected invalid token with HTTP 403!

🎉 ALL VERIFICATION TESTS COMPLETED AND PASSED PERFECTLY!
```

---

## 4. TypeScript Typecheck & Production Build Verification

### 4.1 Typecheck (`npx tsc --noEmit`)
```
Exit code: 0
Verbatim output: (clean, 0 errors)
```

### 4.2 Production Build (`npm run build`)
```
> smart-cookie@1.0.0 build
> vite build && esbuild server/src/index.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs

vite v6.4.3 building for production...
transforming...
✓ 2237 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     0.40 kB │ gzip:   0.27 kB
dist/assets/index-CkKUDqgT.css     83.19 kB │ gzip:  13.10 kB
dist/assets/index-CrrXgA-d.js   2,160.82 kB │ gzip: 408.85 kB
✓ built in 7.07s
  dist/server.cjs      620.3kb
  dist/server.cjs.map    1.1mb
⚡ Done in 136ms
```
