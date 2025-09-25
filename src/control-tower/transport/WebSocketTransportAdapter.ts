/// <reference types="node" />
/**
 * WebSocket Transport Adapter with Authentication Support
 */

import { EventEmitter } from 'events';
import type { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type {
  ITransportAdapter,
  ClientConnection,
  TransportConfig,
  IWebSocket,
  IHttpRequest,
} from '../types/transport.js';
import type {
  IAuthAdapter,
  AuthResult,
  AuthMessage,
  AuthSuccessMessage,
  AuthErrorMessage,
} from '../types/auth.js';

/**
 * WebSocket Transport Adapter implementation
 */
export class WebSocketTransportAdapter extends EventEmitter implements ITransportAdapter {
  private clients: Map<string, ClientConnection> = new Map();
  private authAdapter?: IAuthAdapter;
  private messageHandler?: (clientId: string, message: unknown) => void;
  private config: TransportConfig;
  private authTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private wss?: WebSocketServer;
  private clientIdCounter = 0;

  constructor(config: TransportConfig = {}) {
    super();
    this.config = {
      closeOnAuthFailure: true,
      authTimeout: 5000,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  /**
   * Set the authentication adapter
   */
  setAuthAdapter(auth: IAuthAdapter): void {
    this.authAdapter = auth;
  }

  /**
   * Set message handler
   */
  setMessageHandler(handler: (clientId: string, message: unknown) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Initialize WebSocket server
   */
  async start(): Promise<void> {
    // This would be initialized with actual WebSocketServer
    // For now, we'll implement the connection handling logic
  }

  /**
   * Stop the transport
   */
  async stop(): Promise<void> {
    // Clear all auth timeouts
    this.authTimeouts.forEach(timeout => clearTimeout(timeout as NodeJS.Timeout));
    this.authTimeouts.clear();

    // Disconnect all clients
    this.clients.forEach((client, clientId) => {
      this.disconnectClient(clientId, 'Server shutting down');
    });

    if (this.wss) {
      this.wss.close();
    }
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    const clientId = this.generateClientId();
    const httpRequest: IHttpRequest = {
      headers: request.headers as Record<string, string | string[] | undefined>,
      url: request.url,
      method: request.method,
    };

    // Step 1: Try header authentication
    let authenticated = false;
    let authResult: AuthResult | null = null;

    const authHeader = request.headers.authorization;
    if (authHeader && this.authAdapter) {
      const token = this.extractBearerToken(authHeader as string);
      if (token) {
        try {
          // Try validateToken if available, otherwise use authenticate
          if (this.authAdapter.validateToken) {
            authResult = await this.authAdapter.validateToken(token);
          } else {
            authResult = await this.authAdapter.authenticate({
              type: 'bearer',
              token: token,
            });
          }
          authenticated = authResult.success;
        } catch (error) {
          console.error('Header authentication error:', error);
        }
      }
    }

    // Step 2: Create client with auth state
    const client: ClientConnection = {
      id: clientId,
      socket: ws as unknown as IWebSocket,
      authenticated,
      userId: authResult?.userId,
      metadata: authResult?.metadata,
      state: authenticated ? 'authenticated' : 'connected',
      connectedAt: Date.now(),
      authenticatedAt: authenticated ? Date.now() : undefined,
    };

    this.clients.set(clientId, client);

    // Set up WebSocket event handlers
    ws.on('message', (data: Buffer | string) => {
      this.handleMessage(clientId, data);
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error: Error) => {
      this.emit('error', { clientId, error });
    });

    // Emit connection event
    this.emit('client_connected', { clientId, request: httpRequest });

    // Step 3: Handle authentication state
    if (authenticated) {
      // Notify server of authenticated connection
      this.emit('client_authenticated', {
        clientId,
        userId: client.userId!,
        metadata: client.metadata,
      });
    } else {
      // Check if authentication is required
      const authRequired = this.authAdapter?.isAuthRequired?.() ?? false;
      if (authRequired) {
        this.setPendingAuthTimeout(client);
      }
    }
  }

  /**
   * Handle incoming message from client
   */
  private async handleMessage(clientId: string, data: Buffer | string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(data.toString());
    } catch {
      this.sendError(client, 'Invalid message format');
      return;
    }

    // Special handling for auth messages
    const msg = message as { type?: string };
    if (msg.type === 'authenticate' && !client.authenticated) {
      await this.handleAuthMessage(client, message as AuthMessage);
      return;
    }

    // Reject messages from unauthenticated clients if auth is required
    if (!client.authenticated && this.authAdapter?.isAuthRequired?.()) {
      this.sendError(client, 'Not authenticated');
      return;
    }

    // Forward message to handler
    if (this.messageHandler) {
      this.messageHandler(clientId, message);
    }

    // Emit message event
    this.emit('message', { clientId, message });
  }

  /**
   * Handle authentication message
   */
  private async handleAuthMessage(client: ClientConnection, message: AuthMessage): Promise<void> {
    if (!this.authAdapter) {
      this.sendError(client, 'No auth adapter configured');
      return;
    }

    // Clear any pending auth timeout
    const timeout = this.authTimeouts.get(client.id);
    if (timeout) {
      clearTimeout(timeout as NodeJS.Timeout);
      this.authTimeouts.delete(client.id);
    }

    try {
      const result = await this.authAdapter.authenticate(message.credentials);

      if (result.success) {
        // Update client state
        client.authenticated = true;
        client.userId = result.userId;
        client.metadata = result.metadata;
        client.state = 'authenticated';
        client.authenticatedAt = Date.now();

        // Send success message
        const successMsg: AuthSuccessMessage = {
          type: 'auth_success',
          userId: result.userId!,
          metadata: result.metadata,
        };
        this.sendToClient(client.id, successMsg);

        // Emit authentication event
        this.emit('client_authenticated', {
          clientId: client.id,
          userId: result.userId!,
          metadata: result.metadata,
        });
      } else {
        // Send error message
        const errorMsg: AuthErrorMessage = {
          type: 'auth_error',
          error: result.error || 'Authentication failed',
        };
        this.sendToClient(client.id, errorMsg);

        // Optionally close connection after auth failure
        if (this.config.closeOnAuthFailure) {
          setTimeout(() => {
            client.socket.close(1008, 'Authentication failed');
          }, 100);
        }
      }
    } catch (error) {
      this.sendError(client, 'Authentication error');
      console.error('Authentication error:', error);
    }
  }

  /**
   * Set pending authentication timeout
   */
  private setPendingAuthTimeout(client: ClientConnection): void {
    const timeout = this.authAdapter?.getAuthTimeout?.() ?? this.config.authTimeout ?? 5000;

    const timer = setTimeout(() => {
      if (!client.authenticated) {
        this.sendError(client, 'Authentication timeout');
        client.socket.close(1008, 'Authentication timeout');
        this.authTimeouts.delete(client.id);
      }
    }, timeout);

    this.authTimeouts.set(client.id, timer);
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // Clear auth timeout if exists
    const timeout = this.authTimeouts.get(clientId);
    if (timeout) {
      clearTimeout(timeout as NodeJS.Timeout);
      this.authTimeouts.delete(clientId);
    }

    // Update client state
    client.state = 'disconnected';

    // Remove from clients map
    this.clients.delete(clientId);

    // Emit disconnection event
    this.emit('client_disconnected', { clientId });
  }

  /**
   * Extract bearer token from authorization header
   */
  private extractBearerToken(authHeader: string): string | null {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  /**
   * Send error message to client
   */
  private sendError(client: ClientConnection, error: string): void {
    const errorMsg = {
      type: 'error',
      error,
      timestamp: Date.now(),
    };
    this.sendToClient(client.id, errorMsg);
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: unknown): void {
    const client = this.clients.get(clientId);
    if (client && client.state !== 'disconnected') {
      try {
        const data = typeof message === 'string' ? message : JSON.stringify(message);
        client.socket.send(data);
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
      }
    }
  }

  /**
   * Broadcast message to all authenticated clients
   */
  broadcast(message: unknown, excludeClientId?: string): void {
    const data = typeof message === 'string' ? message : JSON.stringify(message);
    
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId && client.authenticated && client.state !== 'disconnected') {
        try {
          client.socket.send(data);
        } catch (error) {
          console.error(`Error broadcasting to client ${clientId}:`, error);
        }
      }
    });
  }

  /**
   * Get connected client by ID
   */
  getClient(clientId: string): ClientConnection | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all connected clients
   */
  getClients(): Map<string, ClientConnection> {
    return new Map(this.clients);
  }

  /**
   * Disconnect a client
   */
  disconnectClient(clientId: string, reason?: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.socket.close(1000, reason || 'Disconnected by server');
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${++this.clientIdCounter}-${Date.now()}`;
  }
}