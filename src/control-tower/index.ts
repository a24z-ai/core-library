/**
 * Control Tower Core - WebSocket collaboration framework with authentication
 */

// Export types
export type {
  // Auth types
  IAuthAdapter,
  Credentials,
  JWTCredentials,
  BearerCredentials,
  APIKeyCredentials,
  OAuthCredentials,
  CustomCredentials,
  AuthResult,
  AuthMessage,
  AuthSuccessMessage,
  AuthErrorMessage,
  ClientAuthState,
  CredentialType,
} from './types/auth.js';

export type {
  // Transport types
  ITransportAdapter,
  IWebSocket,
  IHttpRequest,
  ClientConnection,
  TransportConfig,
  TransportEvents,
  MessageType,
  BaseMessage,
  RoomJoinMessage,
  RoomLeaveMessage,
  RoomMessage,
  ErrorMessage,
} from './types/transport.js';

export type {
  // Server types
  ServerConfig,
  CORSConfig,
  RoomConfig,
  Room,
  ServerEvents,
} from './server/BaseServer.js';

export type {
  // Auth adapter configs
  JWTAuthConfig,
  JWTPayload,
  JWTVerifier,
} from './auth/JWTAuthAdapter.js';

export type {
  OptionalAuthConfig,
} from './auth/OptionalAuthAdapter.js';

// Export classes
export { BaseServer } from './server/BaseServer.js';
export { ServerBuilder } from './server/ServerBuilder.js';
export { WebSocketTransportAdapter } from './transport/WebSocketTransportAdapter.js';
export { JWTAuthAdapter } from './auth/JWTAuthAdapter.js';
export { OptionalAuthAdapter } from './auth/OptionalAuthAdapter.js';