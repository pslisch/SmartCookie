/**
 * Deny-list patterns for redacting sensitive fields from audit log payloads.
 * 
 * NOTE: This is a deliberate deny-list, not exhaustive, and callers must still
 * avoid passing secrets, tokens, or credentials in the first place.
 */
const SENSITIVE_KEY_PATTERN = /password|token|secret|apikey|api_key|accesstoken|refreshtoken|resettoken|mfasecret|hash|credential/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

/**
 * Recursively sanitizes data payloads before persisting to AuditLog.
 * Any key matching the sensitive key deny-list is stripped entirely (deleted)
 * rather than masked, ensuring secrets are never persisted.
 */
export function sanitizeAuditPayload<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      // Deliberately omit sensitive keys entirely
      continue;
    }
    sanitized[key] = sanitizeAuditPayload(val);
  }

  return sanitized as T;
}

/**
 * Builds a user's display name following the standard convention:
 * `[user.firstName, user.lastName].filter(Boolean).join(' ').trim()`
 * falling back to username, then email, then id.
 */
export function getUserDisplayName(
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    email?: string | null;
    id?: string;
  } | null
): string {
  if (!user) return 'Unknown User';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (user.username) return user.username;
  if (user.email) return user.email;
  if (user.id) return user.id;
  return 'Unknown User';
}
