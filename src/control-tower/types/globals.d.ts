/**
 * Global type declarations for Control Tower Core
 */

/// <reference types="node" />

declare global {
  const setTimeout: typeof globalThis.setTimeout;
  const clearTimeout: typeof globalThis.clearTimeout;
  
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Timeout extends ReturnType<typeof setTimeout> {}
  }
}

export {};