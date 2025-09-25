/**
 * JWT Authentication Adapter implementation
 */

import type {
  IAuthAdapter,
  Credentials,
  AuthResult,
  CredentialType,
} from '../types/auth.js';

/**
 * JWT verification interface (compatible with jsonwebtoken or jose)
 */
export interface JWTVerifier {
  verify(token: string, secret: string | Buffer): unknown;
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  sub?: string;  // Subject (user ID)
  exp?: number;  // Expiration time
  iat?: number;  // Issued at
  permissions?: string[];
  roles?: string[];
  [key: string]: unknown;
}

/**
 * JWT Auth Adapter configuration
 */
export interface JWTAuthConfig {
  secret: string | Buffer;
  verifier?: JWTVerifier;
  authRequired?: boolean;
  authTimeout?: number;
  extractUserId?: (payload: JWTPayload) => string;
  extractMetadata?: (payload: JWTPayload) => Record<string, unknown>;
}

/**
 * JWT Authentication Adapter
 */
export class JWTAuthAdapter implements IAuthAdapter {
  private config: JWTAuthConfig;
  private verifier?: JWTVerifier;

  constructor(config: JWTAuthConfig | string) {
    if (typeof config === 'string') {
      this.config = {
        secret: config,
        authRequired: true,
        authTimeout: 5000,
      };
    } else {
      this.config = {
        authRequired: true,
        authTimeout: 5000,
        ...config,
      };
    }

    this.verifier = this.config.verifier;
  }

  /**
   * Authenticate using provided credentials
   */
  async authenticate(credentials: Credentials): Promise<AuthResult> {
    // Only handle JWT and Bearer token types
    if (credentials.type !== 'jwt' && credentials.type !== 'bearer') {
      return {
        success: false,
        error: `Unsupported credential type: ${credentials.type}`,
      };
    }

    // Extract token based on credential type
    let token: string;
    if (credentials.type === 'jwt' && 'token' in credentials) {
      token = credentials.token;
    } else if (credentials.type === 'bearer' && 'token' in credentials) {
      token = credentials.token;
    } else {
      return {
        success: false,
        error: 'Token not provided',
      };
    }

    // Validate token
    return this.validateToken(token);
  }

  /**
   * Validate a JWT token
   */
  async validateToken(token: string): Promise<AuthResult> {
    if (!token) {
      return {
        success: false,
        error: 'Token not provided',
      };
    }

    try {
      let payload: JWTPayload;

      if (this.verifier) {
        // Use provided verifier (e.g., jsonwebtoken)
        payload = this.verifier.verify(token, this.config.secret) as JWTPayload;
      } else {
        // Simple JWT decode (for demonstration - in production use a proper library)
        payload = this.simpleJWTDecode(token);
      }

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return {
          success: false,
          error: 'Token expired',
        };
      }

      // Extract user ID
      const userId = this.config.extractUserId 
        ? this.config.extractUserId(payload)
        : payload.sub || payload.userId || payload.id;

      if (!userId) {
        return {
          success: false,
          error: 'User ID not found in token',
        };
      }

      // Extract metadata
      const metadata = this.config.extractMetadata
        ? this.config.extractMetadata(payload)
        : {
            permissions: payload.permissions,
            roles: payload.roles,
            expiresAt: payload.exp ? payload.exp * 1000 : undefined,
          };

      return {
        success: true,
        userId: String(userId),
        metadata,
      };
    } catch (error) {
      console.error('JWT validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      };
    }
  }

  /**
   * Simple JWT decode for demonstration
   * In production, use a proper JWT library like jsonwebtoken or jose
   */
  private simpleJWTDecode(token: string): JWTPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );
      return payload;
    } catch {
      throw new Error('Failed to decode JWT');
    }
  }

  /**
   * Check if authentication is required
   */
  isAuthRequired(): boolean {
    return this.config.authRequired ?? true;
  }

  /**
   * Get authentication timeout
   */
  getAuthTimeout(): number {
    return this.config.authTimeout ?? 5000;
  }

  /**
   * Get supported credential types
   */
  getSupportedCredentialTypes(): CredentialType[] {
    return ['jwt', 'bearer'];
  }
}