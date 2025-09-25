/**
 * Transport layer types and interfaces
 */

import { EventEmitter } from 'events';
import { IAuthAdapter } from './auth.js';

/**
 * WebSocket-like interface for transport abstraction
 */
export interface IWebSocket {
  send(data: string | Buffer): void;
  close(code?: number, reason?: string): void;
  on(event: 'message', handler: (data: Buffer | string) => void): void;
  on(event: 'close', handler: () => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
  removeListener(event: string, handler: (...args: unknown[]) => void): void;
}

/**
 * HTTP request interface for initial connection
 */
export interface IHttpRequest {
  headers: Record<string, string | string[] | undefined>;
  url?: string;
  method?: string;
}

/**
 * Client connection representation
 */
export interface ClientConnection {
  id: string;
  socket: IWebSocket;
  authenticated: boolean;
  userId?: string;
  metadata?: Record<string, unknown>;
  state: 'connected' | 'authenticated' | 'disconnected';
  connectedAt: number;
  authenticatedAt?: number;
}

/**
 * Transport adapter configuration
 */
export interface TransportConfig {
  closeOnAuthFailure?: boolean;
  authTimeout?: number;
  heartbeatInterval?: number;
}

/**
 * Transport adapter events
 */
export interface TransportEvents {
  'client_connected': { clientId: string; request?: IHttpRequest };
  'client_authenticated': { clientId: string; userId: string; metadata?: Record<string, unknown> };
  'client_disconnected': { clientId: string; reason?: string };
  'message': { clientId: string; message: unknown };
  'error': { clientId?: string; error: Error };
}

/**
 * Base transport adapter interface
 */
export interface ITransportAdapter extends EventEmitter {
  /**
   * Set the authentication adapter
   */
  setAuthAdapter?(auth: IAuthAdapter): void;
  
  /**
   * Set message handler
   */
  setMessageHandler(handler: (clientId: string, message: unknown) => void): void;
  
  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: unknown): void;
  
  /**
   * Broadcast message to all authenticated clients
   */
  broadcast(message: unknown, excludeClientId?: string): void;
  
  /**
   * Get connected client by ID
   */
  getClient(clientId: string): ClientConnection | undefined;
  
  /**
   * Get all connected clients
   */
  getClients(): Map<string, ClientConnection>;
  
  /**
   * Disconnect a client
   */
  disconnectClient(clientId: string, reason?: string): void;
  
  /**
   * Start the transport
   */
  start(): Promise<void>;
  
  /**
   * Stop the transport
   */
  stop(): Promise<void>;
}

/**
 * Message types
 */
export type MessageType = 
  | 'authenticate'
  | 'auth_success'
  | 'auth_error'
  | 'room:join'
  | 'room:leave'
  | 'room:message'
  | 'error'
  | string;

/**
 * Base message interface
 */
export interface BaseMessage {
  type: MessageType;
  timestamp?: number;
}

/**
 * Room join message
 */
export interface RoomJoinMessage extends BaseMessage {
  type: 'room:join';
  roomId: string;
}

/**
 * Room leave message
 */
export interface RoomLeaveMessage extends BaseMessage {
  type: 'room:leave';
  roomId: string;
}

/**
 * Room message
 */
export interface RoomMessage extends BaseMessage {
  type: 'room:message';
  roomId: string;
  content: unknown;
}

/**
 * Error message
 */
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  error: string;
  code?: string;
}