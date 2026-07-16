/**
 * Microsoft Entra Graph API Client.
 * Handles OAuth code exchange, application token acquisition with caching,
 * robust pagination following @odata.nextLink, and exponential backoff on 429 rate limiting.
 */
export class EntraGraphClient {
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;
  private appToken: string | null = null;
  private appTokenExpiresAt: number = 0; // Epoch timestamp in ms

  constructor(tenantId: string, clientId: string, clientSecret: string) {
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Helper to perform fetch requests with exponential backoff for 429 Too Many Requests responses.
   */
  private async fetchWithRetry(url: string, options: any, retries = 3, delay = 1000): Promise<any> {
    try {
      const response = await fetch(url, options);

      if (response.status === 429 && retries > 0) {
        const retryAfterHeader = response.headers.get('Retry-After');
        let waitMs = delay;
        if (retryAfterHeader) {
          const seconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(seconds)) {
            waitMs = seconds * 1000;
          }
        }
        console.warn(`[EntraGraphClient] 429 Too Many Requests. Retrying in ${waitMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return this.fetchWithRetry(url, options, retries - 1, delay * 2);
      }

      return response;
    } catch (error: any) {
      if (retries > 0) {
        console.warn(`[EntraGraphClient] Network error: ${error.message}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  /**
   * Exchanges an OAuth authorization code for delegated access, ID, and refresh tokens.
   */
  async acquireDelegatedToken(code: string, redirectUri: string): Promise<{ access_token: string; id_token?: string; refresh_token?: string; expires_in: number }> {
    const url = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: this.clientId,
      scope: 'openid profile email https://graph.microsoft.com/User.Read',
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      client_secret: this.clientSecret,
    });

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to acquire delegated token: ${response.statusText}. Details: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Acquires an application token via the Client Credentials flow.
   * Caches the token to avoid re-acquisition on subsequent calls until near expiry.
   */
  async acquireApplicationToken(): Promise<string> {
    const now = Date.now();
    // Cache is valid if we have a token and we are not within 5 minutes of expiry
    if (this.appToken && this.appTokenExpiresAt > now + 5 * 60 * 1000) {
      return this.appToken;
    }

    const url = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: this.clientId,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
      client_secret: this.clientSecret,
    });

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to acquire application token: ${response.statusText}. Details: ${errorText}`);
    }

    const data = await response.json();
    this.appToken = data.access_token;
    const expiresInMs = (data.expires_in || 3600) * 1000;
    this.appTokenExpiresAt = Date.now() + expiresInMs;

    return this.appToken!;
  }

  /**
   * Helper to aggregate paginated Graph API results by following the @odata.nextLink.
   */
  private async getPaginatedResults<T>(initialUrl: string): Promise<T[]> {
    const token = await this.acquireApplicationToken();
    let url: string | null = initialUrl;
    const results: T[] = [];

    while (url) {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errJson = await response.json();
          errorDetails = errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errorDetails = await response.text();
        }
        throw new Error(`Graph API Call Failed: GET ${url} returned ${response.status} ${response.statusText}. Details: ${errorDetails}`);
      }

      const data = await response.json();
      if (data.value && Array.isArray(data.value)) {
        results.push(...data.value);
      }

      url = data['@odata.nextLink'] || null;
    }

    return results;
  }

  /**
   * Fetches all users from Entra ID with mapped attribute details.
   */
  async getUsers(): Promise<any[]> {
    return this.getPaginatedResults<any>(
      'https://graph.microsoft.com/v1.0/users?$select=id,userPrincipalName,mail,displayName,givenName,surname,jobTitle,department,accountEnabled'
    );
  }

  /**
   * Fetches all groups from Entra ID.
   */
  async getGroups(): Promise<any[]> {
    return this.getPaginatedResults<any>(
      'https://graph.microsoft.com/v1.0/groups?$select=id,displayName,description,mailNickname,securityEnabled'
    );
  }

  /**
   * Fetches all members of a group from Entra ID.
   */
  async getGroupMembers(groupId: string): Promise<any[]> {
    return this.getPaginatedResults<any>(
      `https://graph.microsoft.com/v1.0/groups/${groupId}/members?$select=id,userPrincipalName,mail,displayName,givenName,surname,jobTitle,department,accountEnabled`
    );
  }

  /**
   * Retrieves user's profile photo. Returns null if photo is not set or 404.
   */
  async getUserPhoto(userId: string): Promise<Buffer | null> {
    const token = await this.acquireApplicationToken();
    const url = `https://graph.microsoft.com/v1.0/users/${userId}/photo/$value`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errJson = await response.json();
        errorDetails = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errorDetails = await response.text();
      }
      throw new Error(`Graph API Photo Call Failed: GET ${url} returned ${response.status} ${response.statusText}. Details: ${errorDetails}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Validates Entra connection credentials by performing a lightweight organization fetch.
   */
  static async validateConnection(tenantId: string, clientId: string, clientSecret: string): Promise<boolean> {
    try {
      const client = new EntraGraphClient(tenantId, clientId, clientSecret);
      const token = await client.acquireApplicationToken();
      
      const response = await client.fetchWithRetry('https://graph.microsoft.com/v1.0/organization', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errJson = await response.json();
          errorDetails = errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errorDetails = await response.text();
        }
        throw new Error(`Validation call failed: ${response.statusText}. Details: ${errorDetails}`);
      }

      return true;
    } catch (error: any) {
      throw new Error(`Connection validation failed: ${error.message}`);
    }
  }
}
