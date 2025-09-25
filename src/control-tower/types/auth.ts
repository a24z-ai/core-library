/**
 * Authentication types and interfaces for Control Tower Core
 */

/**
 * Supported credential types for authentication
 */
export type CredentialType = 'jwt' | 'bearer' | 'apikey' | 'oauth' | 'custom';

/**
 * Base credentials interface
 */
export interface BaseCredentials {
  type: CredentialType;
}

/**
 * JWT credentials
 */
export interface JWTCredentials extends BaseCredentials {
  type: 'jwt';
  token: string;
}

/**
 * Bearer token credentials
 */
export interface BearerCredentials extends BaseCredentials {
  type: 'bearer';
  token: string;
}

/**
 * API key credentials
 */
export interface APIKeyCredentials extends BaseCredentials {
  type: 'apikey';
  key: string;
}

/**
 * OAuth credentials
 */
export interface OAuthCredentials extends BaseCredentials {
  type: 'oauth';
  provider: string;
  token: string;
}

/**
 * Custom credentials for extensibility
 */
export interface CustomCredentials extends BaseCredentials {
  type: 'custom';
  [key: string]: unknown;
}

/**
 * Union type of all credential types
 */
export type Credentials = 
  | JWTCredentials
  | BearerCredentials
  | APIKeyCredentials
  | OAuthCredentials
  | CustomCredentials;

/**
 * Result of authentication attempt
 */
export interface AuthResult {
  success: boolean;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * Authentication adapter interface
 */
export interface IAuthAdapter {
  /**
   * Authenticate using provided credentials
   */
  authenticate(credentials: Credentials): Promise<AuthResult>;
  
  /**
   * Validate a token (typically from headers)
   */
  validateToken?(token: string): Promise<AuthResult>;
  
  /**
   * Check if authentication is required
   */
  isAuthRequired?(): boolean;
  
  /**
   * Get authentication timeout in milliseconds
   */
  getAuthTimeout?(): number;
  
  /**
   * Get supported credential types
   */
  getSupportedCredentialTypes?(): CredentialType[];
}

/**
 * Authentication message sent by client
 */
export interface AuthMessage {
  type: 'authenticate';
  credentials: Credentials;
}

/**
 * Authentication success message
 */
export interface AuthSuccessMessage {
  type: 'auth_success';
  userId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Authentication error message
 */
export interface AuthErrorMessage {
  type: 'auth_error';
  error: string;
}

/**
 * Client authentication state
 */
export interface ClientAuthState {
  authenticated: boolean;
  userId?: string;
  metadata?: Record<string, unknown>;
  authenticatedAt?: number;
}