import * as jose from 'jose';
import { EntraTokenValidator } from './entraTokenValidator';

// A test-specific subclass of EntraTokenValidator that allows injecting a local JWKS resolver
class TestEntraTokenValidator extends EntraTokenValidator {
  private mockJwks: any;

  constructor(tenantId: string, clientId: string, mockJwks: any) {
    super(tenantId, clientId);
    this.mockJwks = mockJwks;
  }

  // Override to return our local mock keyset instead of calling Microsoft's HTTP endpoint
  // @ts-ignore
  protected getJWKSFunction() {
    return this.mockJwks;
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('RUNNING ENTRA TOKEN VALIDATOR SECURITY VERIFICATION');
  console.log('==================================================\n');

  const tenantId = 'test-tenant-123';
  const clientId = 'test-client-abc';

  // 1. Generate RSA key pair for signing and verifying
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256');

  // Convert the public key to JWK format for our mock JWKS resolver
  const jwk = await jose.exportJWK(publicKey);
  jwk.kid = 'test-key-id';
  jwk.alg = 'RS256';

  const mockJwksResolver = async (protectedHeader: any) => {
    if (protectedHeader.kid === jwk.kid) {
      return publicKey;
    }
    throw new Error('JWK not found for kid: ' + protectedHeader.kid);
  };

  const validator = new TestEntraTokenValidator(tenantId, clientId, mockJwksResolver);

  // Helper to generate a signed token
  async function generateToken(payload: any, secretKey: any = privateKey, kid: string = 'test-key-id') {
    return await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(secretKey);
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ SUCCESS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      failed++;
    }
  }

  // --- TEST CASE 1: Happy Path ---
  try {
    const validPayload = {
      sub: 'user-sub-111',
      oid: 'entra-oid-222',
      tid: tenantId,
      aud: clientId,
      iss: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      email: 'user@example.com',
      name: 'John Doe',
    };
    const validToken = await generateToken(validPayload);
    const decoded = await validator.validate(validToken);
    assert(decoded.oid === 'entra-oid-222' && decoded.sub === 'user-sub-111', 'Should successfully validate a valid token');
  } catch (error: any) {
    assert(false, `Should successfully validate a valid token. Error: ${error.message}`);
  }

  // --- TEST CASE 2: Wrong Audience (aud) ---
  try {
    const wrongAudPayload = {
      sub: 'user-sub-111',
      oid: 'entra-oid-222',
      tid: tenantId,
      aud: 'different-client-id',
      iss: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      email: 'user@example.com',
    };
    const wrongAudToken = await generateToken(wrongAudPayload);
    await validator.validate(wrongAudToken);
    assert(false, 'Should reject token with wrong audience');
  } catch (error: any) {
    assert(
      error.message.includes('verification failed') || error.message.includes('audience'),
      `Should reject wrong audience. Got error: "${error.message}"`
    );
  }

  // --- TEST CASE 3: Wrong Issuer (iss) ---
  try {
    const wrongIssPayload = {
      sub: 'user-sub-111',
      oid: 'entra-oid-222',
      tid: tenantId,
      aud: clientId,
      iss: `https://login.evil-hacker.com/${tenantId}/v2.0`,
      email: 'user@example.com',
    };
    const wrongIssToken = await generateToken(wrongIssPayload);
    await validator.validate(wrongIssToken);
    assert(false, 'Should reject token with wrong issuer');
  } catch (error: any) {
    assert(
      error.message.includes('Invalid token issuer') || error.message.includes('issuer'),
      `Should reject wrong issuer. Got error: "${error.message}"`
    );
  }

  // --- TEST CASE 4: Tampered Signature ---
  try {
    const payload = {
      sub: 'user-sub-111',
      oid: 'entra-oid-222',
      tid: tenantId,
      aud: clientId,
      iss: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      email: 'user@example.com',
    };
    const validToken = await generateToken(payload);
    
    // Tamper with the signature part of the JWT
    const parts = validToken.split('.');
    const tamperedSignature = parts[2].slice(0, -5) + 'AAAAA';
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

    await validator.validate(tamperedToken);
    assert(false, 'Should reject token with tampered signature');
  } catch (error: any) {
    assert(
      error.message.includes('signature') || error.message.includes('verification failed'),
      `Should reject tampered signature. Got error: "${error.message}"`
    );
  }

  // --- TEST CASE 5: Different/Invalid Key Signature ---
  try {
    const payload = {
      sub: 'user-sub-111',
      oid: 'entra-oid-222',
      tid: tenantId,
      aud: clientId,
      iss: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      email: 'user@example.com',
    };
    // Generate a completely separate, unauthorized keypair
    const { privateKey: badPrivateKey } = await jose.generateKeyPair('RS256');
    const badSignedToken = await generateToken(payload, badPrivateKey);

    await validator.validate(badSignedToken);
    assert(false, 'Should reject token signed by untrusted/unauthorized key');
  } catch (error: any) {
    assert(
      error.message.includes('signature') || error.message.includes('verification failed'),
      `Should reject untrusted key signature. Got error: "${error.message}"`
    );
  }

  console.log('\n==================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
