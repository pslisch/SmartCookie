import * as jose from 'jose';

export interface EntraTokenPayload {
  sub: string;
  oid: string; // Object ID of the user in Entra ID
  tid: string; // Tenant ID
  aud: string; // Audience (Client ID)
  iss: string; // Issuer
  email?: string;
  preferred_username?: string;
  upn?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  exp: number;
}

export class EntraTokenValidator {
  private tenantId: string;
  private clientId: string;
  private jwksUri: string;
  private jwksCache: any = null;

  constructor(tenantId: string, clientId: string, customJwksUri?: string) {
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.jwksUri = customJwksUri || `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
  }

  /**
   * Returns the JWK Set function, caching it as a remote JWK Set.
   */
  protected getJWKSFunction() {
    if (!this.jwksCache) {
      this.jwksCache = jose.createRemoteJWKSet(new URL(this.jwksUri));
    }
    return this.jwksCache;
  }

  /**
   * Resets the JWKS cache (useful for testing or manual refresh).
   */
  public resetCache(): void {
    this.jwksCache = null;
  }

  /**
   * Validates the provided ID token.
   * Verifies the signature against the Microsoft JWKS, checks issuer, audience, and expiration.
   */
  async validate(idToken: string): Promise<EntraTokenPayload> {
    if (!idToken) {
      throw new Error('ID token is required');
    }

    // Step 1: Decode protected header to check if it's a valid JWT
    let header;
    try {
      header = jose.decodeProtectedHeader(idToken);
    } catch (error: any) {
      throw new Error(`Invalid token format: ${error.message}`);
    }

    if (!header.alg) {
      throw new Error('Missing algorithm in token header');
    }

    // Step 2: Verify signature using JWKS
    let payload: jose.JWTPayload;
    try {
      const jwks = this.getJWKSFunction();
      const result = await jose.jwtVerify(idToken, jwks, {
        audience: this.clientId,
      });
      payload = result.payload;
    } catch (error: any) {
      throw new Error(`Token signature or audience verification failed: ${error.message}`);
    }

    // Step 3: Validate issuer
    // Entra ID v2 issuers usually look like: https://login.microsoftonline.com/{tenantId}/v2.0
    // and v1/saml issuers can look like: https://sts.windows.net/{tenantId}/
    const expectedIssurers = [
      `https://login.microsoftonline.com/${this.tenantId}/v2.0`,
      `https://login.microsoftonline.com/${this.tenantId}/v2.0/`,
      `https://sts.windows.net/${this.tenantId}/`,
      // support common/organizations for multi-tenant
      `https://login.microsoftonline.com/common/v2.0`,
      `https://login.microsoftonline.com/organizations/v2.0`
    ];

    if (!payload.iss || !expectedIssurers.some(expected => payload.iss === expected)) {
      throw new Error(`Invalid token issuer: ${payload.iss}. Expected issuer for tenant ${this.tenantId}`);
    }

    // Step 4: Ensure necessary claims are present
    if (!payload.sub) {
      throw new Error('Token is missing subject (sub) claim');
    }

    if (!payload.oid) {
      throw new Error('Token is missing Entra Object ID (oid) claim');
    }

    return {
      sub: payload.sub,
      oid: payload.oid as string,
      tid: payload.tid as string,
      aud: payload.aud as string,
      iss: payload.iss as string,
      email: (payload.email || payload.preferred_username || payload.upn) as string | undefined,
      preferred_username: payload.preferred_username as string | undefined,
      upn: payload.upn as string | undefined,
      name: payload.name as string | undefined,
      given_name: payload.given_name as string | undefined,
      family_name: payload.family_name as string | undefined,
      exp: payload.exp as number,
    };
  }
}
