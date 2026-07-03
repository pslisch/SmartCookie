import argon2 from 'argon2';
import { prisma } from '../../../shared/db/prisma';

export class PasswordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export interface AuthUser {
  id: string;
  username: string;
  isSuperuser: boolean;
  recoveryEmail: string;
  companyId: string | null;
  status: string;
}

export interface AuthProvider {
  readonly id: string;
  readonly displayName: string;

  authenticate(credentials: Record<string, any>): Promise<AuthUser>;
}

// Concrete password-based auth helper and provider
export class EmailPasswordAuthProvider implements AuthProvider {
  readonly id = 'email-password';
  readonly displayName = 'Email / Password';

  /**
   * Enforces the strong password policy:
   * - At least 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one digit
   * - At least one special character
   */
  validatePassword(password: string): void {
    if (!password) {
      throw new PasswordValidationError('Password is required.');
    }
    if (password.length < 8) {
      throw new PasswordValidationError('Password must be at least 8 characters long.');
    }
    if (!/[A-Z]/.test(password)) {
      throw new PasswordValidationError('Password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(password)) {
      throw new PasswordValidationError('Password must contain at least one lowercase letter.');
    }
    if (!/[0-9]/.test(password)) {
      throw new PasswordValidationError('Password must contain at least one number.');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new PasswordValidationError('Password must contain at least one special character (e.g., !@#$%^&*).');
    }
  }

  /**
   * Hashes a plain-text password using Argon2.
   * Enforces validation before hashing.
   */
  async hashPassword(password: string): Promise<string> {
    this.validatePassword(password);
    try {
      return await argon2.hash(password);
    } catch (error) {
      console.error('Argon2 hashing failed:', error);
      throw new Error('Failed to secure password. Please try again.');
    }
  }

  /**
   * Verifies a password against an Argon2 hash.
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) return false;
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      console.error('Argon2 verification failed:', error);
      return false;
    }
  }

  /**
   * Authenticates a user with username and password.
   */
  async authenticate(credentials: Record<string, any>): Promise<AuthUser> {
    const { username, password } = credentials;

    if (!username || typeof username !== 'string') {
      throw new AuthenticationError('Username is required.');
    }
    if (!password || typeof password !== 'string') {
      throw new AuthenticationError('Password is required.');
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new AuthenticationError('Invalid username or password.');
    }

    // Check status
    if (user.status !== 'ACTIVE') {
      throw new AuthenticationError(`Account status is ${user.status}. Please contact an administrator.`);
    }

    // Verify password
    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid username or password.');
    }

    return {
      id: user.id,
      username: user.username,
      isSuperuser: user.isSuperuser,
      recoveryEmail: user.recoveryEmail,
      companyId: user.companyId,
      status: user.status,
    };
  }
}

// Export a singleton instance of the default provider
export const emailPasswordAuthProvider = new EmailPasswordAuthProvider();

// Standard interface for auth service wrapper that registers/manages active providers
export interface AuthService {
  getProvider(id: string): AuthProvider;
  registerProvider(provider: AuthProvider): void;
}

class AuthServiceImpl implements AuthService {
  private providers = new Map<string, AuthProvider>();

  constructor() {
    this.registerProvider(emailPasswordAuthProvider);
  }

  registerProvider(provider: AuthProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): AuthProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Authentication provider with ID "${id}" is not registered.`);
    }
    return provider;
  }
}

export const authService: AuthService = new AuthServiceImpl();
