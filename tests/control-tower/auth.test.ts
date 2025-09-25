/**
 * Tests for Control Tower Core Authentication
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { JWTAuthAdapter } from '../../src/control-tower/auth/JWTAuthAdapter';
import { OptionalAuthAdapter } from '../../src/control-tower/auth/OptionalAuthAdapter';
import type { Credentials } from '../../src/control-tower/types/auth';

describe('JWTAuthAdapter', () => {
  let adapter: JWTAuthAdapter;

  beforeEach(() => {
    adapter = new JWTAuthAdapter({
      secret: 'test-secret',
      authRequired: true,
      authTimeout: 5000,
    });
  });

  describe('authenticate', () => {
    it('should reject unsupported credential types', async () => {
      const credentials: Credentials = {
        type: 'apikey',
        key: 'test-key',
      };

      const result = await adapter.authenticate(credentials);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported credential type');
    });

    it('should accept JWT credentials', async () => {
      // Create a simple test token (base64 encoded payload)
      const payload = { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      const credentials: Credentials = {
        type: 'jwt',
        token,
      };

      const result = await adapter.authenticate(credentials);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user123');
    });

    it('should accept Bearer credentials', async () => {
      const payload = { sub: 'user456', exp: Math.floor(Date.now() / 1000) + 3600 };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      const credentials: Credentials = {
        type: 'bearer',
        token,
      };

      const result = await adapter.authenticate(credentials);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user456');
    });

    it('should reject expired tokens', async () => {
      const payload = { sub: 'user789', exp: Math.floor(Date.now() / 1000) - 3600 };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      const credentials: Credentials = {
        type: 'jwt',
        token,
      };

      const result = await adapter.authenticate(credentials);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Token expired');
    });

    it('should extract permissions and roles from token', async () => {
      const payload = {
        sub: 'user999',
        exp: Math.floor(Date.now() / 1000) + 3600,
        permissions: ['read', 'write'],
        roles: ['admin'],
      };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      const result = await adapter.validateToken(token);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.permissions).toEqual(['read', 'write']);
      expect(result.metadata?.roles).toEqual(['admin']);
    });
  });

  describe('configuration', () => {
    it('should support string constructor for simple setup', () => {
      const simpleAdapter = new JWTAuthAdapter('my-secret');
      
      expect(simpleAdapter.isAuthRequired()).toBe(true);
      expect(simpleAdapter.getAuthTimeout()).toBe(5000);
    });

    it('should support custom user ID extraction', async () => {
      const customAdapter = new JWTAuthAdapter({
        secret: 'test',
        extractUserId: (payload) => `custom-${payload.email}`,
      });

      const payload = { email: 'user@example.com', exp: Math.floor(Date.now() / 1000) + 3600 };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      const result = await customAdapter.validateToken(token);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('custom-user@example.com');
    });

    it('should support custom metadata extraction', async () => {
      const customAdapter = new JWTAuthAdapter({
        secret: 'test',
        extractMetadata: (payload) => ({
          email: payload.email,
          customField: 'custom-value',
        }),
      });

      const payload = {
        sub: 'user123',
        email: 'user@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      const result = await customAdapter.validateToken(token);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.email).toBe('user@example.com');
      expect(result.metadata?.customField).toBe('custom-value');
    });
  });

  describe('getSupportedCredentialTypes', () => {
    it('should return JWT and Bearer types', () => {
      const types = adapter.getSupportedCredentialTypes();
      
      expect(types).toContain('jwt');
      expect(types).toContain('bearer');
    });
  });
});

describe('OptionalAuthAdapter', () => {
  let adapter: OptionalAuthAdapter;

  beforeEach(() => {
    adapter = new OptionalAuthAdapter({
      anonymousPermissions: ['read'],
      authenticatedPermissions: ['read', 'write', 'admin'],
    });
  });

  describe('authenticate', () => {
    it('should allow anonymous authentication', async () => {
      const credentials: Credentials = {
        type: 'custom',
      };

      const result = await adapter.authenticate(credentials);
      
      expect(result.success).toBe(true);
      expect(result.userId).toContain('anonymous-');
      expect(result.metadata?.anonymous).toBe(true);
      expect(result.metadata?.permissions).toEqual(['read']);
    });

    it('should authenticate with valid token', async () => {
      const credentials: Credentials = {
        type: 'jwt',
        token: 'valid-token-12345',
      };

      const result = await adapter.authenticate(credentials);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-valid-to');
      expect(result.metadata?.anonymous).toBe(false);
      expect(result.metadata?.permissions).toEqual(['read', 'write', 'admin']);
    });

    it('should use custom validation when provided', async () => {
      const customAdapter = new OptionalAuthAdapter({
        validateCredentials: async (creds) => {
          if (creds.type === 'apikey' && 'key' in creds && creds.key === 'secret-key') {
            return {
              success: true,
              userId: 'api-user',
            };
          }
          return { success: false, error: 'Invalid credentials' };
        },
      });

      const validResult = await customAdapter.authenticate({
        type: 'apikey',
        key: 'secret-key',
      });
      
      expect(validResult.success).toBe(true);
      expect(validResult.userId).toBe('api-user');

      const invalidResult = await customAdapter.authenticate({
        type: 'apikey',
        key: 'wrong-key',
      });
      
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('validateToken', () => {
    it('should validate non-empty tokens', async () => {
      const result = await adapter.validateToken('some-token');
      
      expect(result.success).toBe(true);
      expect(result.metadata?.anonymous).toBe(false);
    });

    it('should return anonymous auth for empty token', async () => {
      const result = await adapter.validateToken('');
      
      expect(result.success).toBe(true);
      expect(result.metadata?.anonymous).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should not require authentication', () => {
      expect(adapter.isAuthRequired()).toBe(false);
    });

    it('should have longer timeout for optional auth', () => {
      expect(adapter.getAuthTimeout()).toBe(10000);
    });

    it('should support multiple credential types', () => {
      const types = adapter.getSupportedCredentialTypes();
      
      expect(types).toContain('jwt');
      expect(types).toContain('bearer');
      expect(types).toContain('apikey');
      expect(types).toContain('custom');
    });
  });
});

describe('Authentication Flow Integration', () => {
  it('should differentiate between authenticated and anonymous users', async () => {
    const adapter = new OptionalAuthAdapter({
      anonymousPermissions: ['view'],
      authenticatedPermissions: ['view', 'edit', 'delete'],
    });

    // Anonymous user
    const anonResult = await adapter.authenticate({ type: 'custom' });
    expect(anonResult.success).toBe(true);
    expect(anonResult.metadata?.permissions).toEqual(['view']);

    // Authenticated user
    const authResult = await adapter.authenticate({
      type: 'bearer',
      token: 'valid-token',
    });
    expect(authResult.success).toBe(true);
    expect(authResult.metadata?.permissions).toEqual(['view', 'edit', 'delete']);
  });

  it('should handle header authentication scenario', async () => {
    const adapter = new JWTAuthAdapter('secret');

    // Simulate Bearer token from Authorization header

    // Create a valid token for testing
    const payload = {
      sub: 'user-from-header',
      exp: Math.floor(Date.now() / 1000) + 3600,
      permissions: ['read', 'write'],
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const validToken = `header.${encodedPayload}.signature`;

    const result = await adapter.validateToken(validToken);
    
    expect(result.success).toBe(true);
    expect(result.userId).toBe('user-from-header');
    expect(result.metadata?.permissions).toEqual(['read', 'write']);
  });
});