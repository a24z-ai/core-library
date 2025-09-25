/**
 * Optional Authentication Adapter - allows both authenticated and anonymous users
 */

import type {
  IAuthAdapter,
  Credentials,
  AuthResult,
  CredentialType,
} from '../types/auth.js';

/**
 * Optional Auth configuration
 */
export interface OptionalAuthConfig {
  anonymousPermissions?: string[];
  authenticatedPermissions?: string[];
  authTimeout?: number;
  validateCredentials?: (credentials: Credentials) => Promise<AuthResult>;
}

/**
 * Optional Authentication Adapter
 * Allows both authenticated and anonymous connections
 */
export class OptionalAuthAdapter implements IAuthAdapter {
  private config: OptionalAuthConfig;
  private anonymousCounter = 0;

  constructor(config: OptionalAuthConfig = {}) {
    this.config = {
      anonymousPermissions: ['read'],
      authenticatedPermissions: ['read', 'write'],
      authTimeout: 10000,
      ...config,
    };
  }

  /**
   * Authenticate using provided credentials
   */
  async authenticate(credentials: Credentials): Promise<AuthResult> {
    // If custom validation is provided, use it
    if (this.config.validateCredentials) {
      const result = await this.config.validateCredentials(credentials);
      if (result.success) {
        // Add authenticated permissions to metadata
        result.metadata = {
          ...result.metadata,
          permissions: this.config.authenticatedPermissions,
          anonymous: false,
        };
      }
      return result;
    }

    // Simple token validation for demonstration
    if (credentials.type === 'jwt' || credentials.type === 'bearer') {
      const token = 'token' in credentials ? credentials.token : null;
      if (token && token.length > 0) {
        // Accept any non-empty token for demonstration
        // In production, implement proper validation
        return {
          success: true,
          userId: `user-${token.substring(0, 8)}`,
          metadata: {
            permissions: this.config.authenticatedPermissions,
            anonymous: false,
            authenticatedAt: Date.now(),
          },
        };
      }
    }

    // Allow anonymous access with limited permissions
    return this.createAnonymousAuth();
  }

  /**
   * Validate a token (for header authentication)
   */
  async validateToken(token: string): Promise<AuthResult> {
    if (token && token.length > 0) {
      return this.authenticate({ type: 'bearer', token });
    }
    return this.createAnonymousAuth();
  }

  /**
   * Create anonymous authentication result
   */
  private createAnonymousAuth(): AuthResult {
    return {
      success: true,
      userId: `anonymous-${++this.anonymousCounter}-${Date.now()}`,
      metadata: {
        permissions: this.config.anonymousPermissions,
        anonymous: true,
        authenticatedAt: Date.now(),
      },
    };
  }

  /**
   * Authentication is not required - allow anonymous
   */
  isAuthRequired(): boolean {
    return false;
  }

  /**
   * Get authentication timeout
   */
  getAuthTimeout(): number {
    return this.config.authTimeout ?? 10000;
  }

  /**
   * Get supported credential types
   */
  getSupportedCredentialTypes(): CredentialType[] {
    return ['jwt', 'bearer', 'apikey', 'custom'];
  }
}