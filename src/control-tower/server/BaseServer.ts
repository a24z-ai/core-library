/**
 * Base Server implementation for Control Tower Core
 */

import { EventEmitter } from 'events';
import type { Server as HTTPServer } from 'http';
import type { WebSocketServer } from 'ws';
import type { ITransportAdapter } from '../types/transport.js';
import type { IAuthAdapter, ClientAuthState } from '../types/auth.js';
import { WebSocketTransportAdapter } from '../transport/WebSocketTransportAdapter.js';

/**
 * Server configuration
 */
export interface ServerConfig {
  httpServer?: HTTPServer;
  port?: number;
  webSocketPath?: string;
  transport?: ITransportAdapter;
  auth?: IAuthAdapter;
  cors?: CORSConfig;
  rooms?: RoomConfig;
}

/**
 * CORS configuration
 */
export interface CORSConfig {
  origin?: string | string[] | ((origin: string) => boolean);
  credentials?: boolean;
  methods?: string[];
  allowedHeaders?: string[];
}

/**
 * Room configuration
 */
export interface RoomConfig {
  maxRoomSize?: number;
  allowDynamicRooms?: boolean;
  defaultPermissions?: string[];
}

/**
 * Room representation
 */
export interface Room {
  id: string;
  name?: string;
  clients: Set<string>;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

/**
 * Server events
 */
export interface ServerEvents {
  'client_connected': { clientId: string };
  'client_authenticated': { clientId: string; userId: string; metadata?: Record<string, unknown> };
  'client_disconnected': { clientId: string };
  'room_created': { roomId: string; room: Room };
  'room_deleted': { roomId: string };
  'client_joined_room': { clientId: string; roomId: string };
  'client_left_room': { clientId: string; roomId: string };
  'error': { error: Error; context?: unknown };
}

/**
 * Base Server implementation
 */
export class BaseServer extends EventEmitter {
  private httpServer?: HTTPServer;
  private wss?: WebSocketServer;
  private transport: ITransportAdapter;
  private auth?: IAuthAdapter;
  private config: ServerConfig;
  private authenticatedClients: Map<string, ClientAuthState> = new Map();
  private rooms: Map<string, Room> = new Map();
  private clientRooms: Map<string, Set<string>> = new Map();
  private isRunning = false;

  constructor(config: ServerConfig) {
    super();
    this.config = config;

    // Initialize transport
    if (config.transport) {
      this.transport = config.transport;
    } else {
      this.transport = new WebSocketTransportAdapter();
    }

    // Set authentication adapter
    this.auth = config.auth;
    if (this.auth && this.transport instanceof WebSocketTransportAdapter) {
      this.transport.setAuthAdapter(this.auth);
    }

    // Set up transport event handlers
    this.setupTransportHandlers();

    // Set up authentication event handlers
    this.setupAuthHandlers();

    // Use provided HTTP server or create one if port is specified
    if (config.httpServer) {
      this.httpServer = config.httpServer;
    }
  }

  /**
   * Set up transport event handlers
   */
  private setupTransportHandlers(): void {
    // Handle client connection
    this.transport.on('client_connected', (event: { clientId: string }) => {
      this.emit('client_connected', { clientId: event.clientId });
    });

    // Handle client disconnection
    this.transport.on('client_disconnected', (event: { clientId: string }) => {
      this.handleClientDisconnection(event.clientId);
    });

    // Handle incoming messages
    this.transport.on('message', (event: { clientId: string; message: unknown }) => {
      this.handleClientMessage(event.clientId, event.message);
    });

    // Handle errors
    this.transport.on('error', (event: { error: Error; context?: unknown }) => {
      this.emit('error', event);
    });

    // Set message handler for transport
    this.transport.setMessageHandler((clientId, message) => {
      this.handleClientMessage(clientId, message);
    });
  }

  /**
   * Set up authentication event handlers
   */
  private setupAuthHandlers(): void {
    this.transport.on('client_authenticated', async (event: { clientId: string; userId: string; metadata?: Record<string, unknown> }) => {
      // Add to authenticated clients list
      this.authenticatedClients.set(event.clientId, {
        authenticated: true,
        userId: event.userId,
        metadata: event.metadata,
        authenticatedAt: Date.now(),
      });

      // Emit server event
      this.emit('client_authenticated', event);
    });
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnection(clientId: string): void {
    // Remove from authenticated clients
    this.authenticatedClients.delete(clientId);

    // Remove from all rooms
    const clientRoomSet = this.clientRooms.get(clientId);
    if (clientRoomSet) {
      clientRoomSet.forEach(roomId => {
        this.removeClientFromRoom(clientId, roomId);
      });
      this.clientRooms.delete(clientId);
    }

    // Emit disconnection event
    this.emit('client_disconnected', { clientId });
  }

  /**
   * Handle incoming client message
   */
  private handleClientMessage(clientId: string, message: unknown): void {
    const msg = message as { type?: string; roomId?: string; metadata?: unknown; content?: unknown };
    // Check if client is authenticated for protected operations
    const authState = this.authenticatedClients.get(clientId);
    const requiresAuth = this.auth?.isAuthRequired?.() ?? false;

    if (requiresAuth && !authState?.authenticated) {
      this.transport.sendToClient(clientId, {
        type: 'error',
        error: 'Authentication required',
      });
      return;
    }

    // Route message based on type
    switch (msg.type) {
      case 'room:join':
        this.handleRoomJoin(clientId, msg.roomId || '', msg.metadata);
        break;
      case 'room:leave':
        this.handleRoomLeave(clientId, msg.roomId || '');
        break;
      case 'room:message':
        this.handleRoomMessage(clientId, msg.roomId || '', msg.content);
        break;
      case 'ping':
        this.transport.sendToClient(clientId, { type: 'pong' });
        break;
      default:
        // Custom message handling
        this.handleCustomMessage(clientId, msg);
    }
  }

  /**
   * Handle room join request
   */
  private handleRoomJoin(clientId: string, roomId: string, metadata?: unknown): void {
    // Check if dynamic rooms are allowed or room exists
    let room = this.rooms.get(roomId);
    if (!room) {
      if (this.config.rooms?.allowDynamicRooms !== false) {
        room = this.createRoom(roomId, metadata);
      } else {
        this.transport.sendToClient(clientId, {
          type: 'error',
          error: 'Room does not exist',
        });
        return;
      }
    }

    // Check room size limit
    const maxSize = this.config.rooms?.maxRoomSize ?? Infinity;
    if (room.clients.size >= maxSize) {
      this.transport.sendToClient(clientId, {
        type: 'error',
        error: 'Room is full',
      });
      return;
    }

    // Add client to room
    room.clients.add(clientId);

    // Track client's rooms
    if (!this.clientRooms.has(clientId)) {
      this.clientRooms.set(clientId, new Set());
    }
    this.clientRooms.get(clientId)!.add(roomId);

    // Send success message
    this.transport.sendToClient(clientId, {
      type: 'room:joined',
      roomId,
      clients: Array.from(room.clients),
    });

    // Notify other clients in room
    this.broadcastToRoom(roomId, {
      type: 'room:client_joined',
      roomId,
      clientId,
    }, clientId);

    // Emit event
    this.emit('client_joined_room', { clientId, roomId });
  }

  /**
   * Handle room leave request
   */
  private handleRoomLeave(clientId: string, roomId: string): void {
    this.removeClientFromRoom(clientId, roomId);

    // Send confirmation
    this.transport.sendToClient(clientId, {
      type: 'room:left',
      roomId,
    });
  }

  /**
   * Handle room message
   */
  private handleRoomMessage(clientId: string, roomId: string, content: unknown): void {
    const room = this.rooms.get(roomId);
    if (!room || !room.clients.has(clientId)) {
      this.transport.sendToClient(clientId, {
        type: 'error',
        error: 'Not in room',
      });
      return;
    }

    // Broadcast message to room
    this.broadcastToRoom(roomId, {
      type: 'room:message',
      roomId,
      clientId,
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle custom message types
   */
  protected handleCustomMessage(_clientId: string, _message: unknown): void {
    // Override in subclasses for custom message handling
  }

  /**
   * Create a new room
   */
  private createRoom(roomId: string, metadata?: unknown): Room {
    const room: Room = {
      id: roomId,
      clients: new Set(),
      metadata: metadata as Record<string, unknown> | undefined,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.emit('room_created', { roomId, room });

    return room;
  }

  /**
   * Remove client from room
   */
  private removeClientFromRoom(clientId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room && room.clients.has(clientId)) {
      room.clients.delete(clientId);

      // Update client's room tracking
      const clientRoomSet = this.clientRooms.get(clientId);
      if (clientRoomSet) {
        clientRoomSet.delete(roomId);
      }

      // Notify other clients
      this.broadcastToRoom(roomId, {
        type: 'room:client_left',
        roomId,
        clientId,
      });

      // Delete empty room if dynamic
      if (room.clients.size === 0 && this.config.rooms?.allowDynamicRooms !== false) {
        this.rooms.delete(roomId);
        this.emit('room_deleted', { roomId });
      }

      // Emit event
      this.emit('client_left_room', { clientId, roomId });
    }
  }

  /**
   * Broadcast message to all clients in a room
   */
  private broadcastToRoom(roomId: string, message: unknown, excludeClientId?: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.clients.forEach(clientId => {
        if (clientId !== excludeClientId) {
          this.transport.sendToClient(clientId, message);
        }
      });
    }
  }

  /**
   * Start the server
   */
  async start(port?: number): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    // Create HTTP server if needed and port is provided
    if (!this.httpServer && port) {
      const http = await import('http');
      this.httpServer = http.createServer();
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(port, () => {
          console.log(`Server listening on port ${port}`);
          resolve();
        });
        this.httpServer!.on('error', reject);
      });
    }

    // Start transport
    await this.transport.start();

    this.isRunning = true;
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Stop transport
    await this.transport.stop();

    // Close HTTP server if we created it
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
    }

    // Clear all state
    this.authenticatedClients.clear();
    this.rooms.clear();
    this.clientRooms.clear();

    this.isRunning = false;
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      clients: {
        total: this.transport.getClients().size,
        authenticated: this.authenticatedClients.size,
      },
      rooms: {
        total: this.rooms.size,
        details: Array.from(this.rooms.values()).map(room => ({
          id: room.id,
          clients: room.clients.size,
          createdAt: room.createdAt,
        })),
      },
    };
  }

  /**
   * Get authenticated client info
   */
  getAuthenticatedClient(clientId: string): ClientAuthState | undefined {
    return this.authenticatedClients.get(clientId);
  }

  /**
   * Get room info
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get transport adapter
   */
  getTransport(): ITransportAdapter {
    return this.transport;
  }

  /**
   * Get auth adapter
   */
  getAuthAdapter(): IAuthAdapter | undefined {
    return this.auth;
  }
}