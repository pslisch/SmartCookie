import crypto from 'crypto';

let keyString = process.env.ENCRYPTION_KEY || process.env.MFA_ENCRYPTION_KEY;

if (!keyString && process.env.NODE_ENV === 'production') {
  throw new Error('ENCRYPTION_KEY or MFA_ENCRYPTION_KEY must be set in production');
}

const keyToUse = keyString || 'smartcookie-mfa-encryption-fallback-key-32-chars';
const derivedKey = crypto.createHash('sha256').update(keyToUse).digest();

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns the format `ivHex:authTagHex:encryptedHex`.
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a ciphertext string using AES-256-GCM.
 * Expects the format `ivHex:authTagHex:encryptedHex`.
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
