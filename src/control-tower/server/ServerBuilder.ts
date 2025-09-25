/**
 * Server Builder for fluent API configuration
 */

import type { Server as HTTPServer } from 'http';
import { BaseServer, ServerConfig } from './BaseServer.js';
import type { ITransportAdapter } from '../types/transport.js';
import type { IAuthAdapter } from '../types/auth.js';

/**
 * Server Builder for fluent configuration
 */
export class ServerBuilder {
  private config: ServerConfig = {};

  /**
   * Set HTTP server for WebSocket upgrade
   */
  withHttpServer(httpServer: HTTPServer): ServerBuilder {
    this.config.httpServer = httpServer;
    return this;
  }

  /**
   * Set port for standalone server
   */
  withPort(port: number): ServerBuilder {
    this.config.port = port;
    return this;
  }

  /**
   * Set WebSocket path
   */
  withWebSocketPath(path: string): ServerBuilder {
    this.config.webSocketPath = path;
    return this;
  }

  /**
   * Set transport adapter
   */
  withTransport(transport: ITransportAdapter): ServerBuilder {
    this.config.transport = transport;
    return this;
  }

  /**
   * Set authentication adapter
   */
  withAuth(auth: IAuthAdapter): ServerBuilder {
    this.config.auth = auth;
    return this;
  }

  /**
   * Configure CORS
   */
  withCORS(options: {
    origin?: string | string[] | ((origin: string) => boolean);
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
  }): ServerBuilder {
    this.config.cors = options;
    return this;
  }

  /**
   * Configure rooms
   */
  withRooms(options: {
    maxRoomSize?: number;
    allowDynamicRooms?: boolean;
    defaultPermissions?: string[];
  }): ServerBuilder {
    this.config.rooms = options;
    return this;
  }

  /**
   * Build the server instance
   */
  build(): BaseServer {
    return new BaseServer(this.config);
  }
}