/**
 * PalaceRoom types for Memory Palace
 * PalaceRooms provide organizational spaces to group related drawings, codebase views, and notes
 */

import type { PalacePortal } from "./palace-portal";

/**
 * Represents a PalaceRoom in the memory palace
 */
export interface PalaceRoom {
  /**
   * Unique identifier for the palace room
   */
  id: string;

  /**
   * Human-readable name for the palace room
   */
  name: string;

  /**
   * Optional description of the palace room's purpose
   */
  description?: string;

  /**
   * IDs of drawings associated with this palace room
   */
  drawingIds: string[];

  /**
   * IDs of codebase views associated with this palace room
   */
  codebaseViewIds: string[];

  /**
   * IDs of notes associated with this palace room
   */
  noteIds: string[];

  /**
   * Creation timestamp
   */
  createdAt: string;

  /**
   * Last modification timestamp
   */
  updatedAt: string;

  /**
   * Optional metadata for extensions
   */
  metadata?: Record<string, unknown>;

  /**
   * Optional color for visual distinction
   */
  color?: string;

  /**
   * Optional icon identifier
   */
  icon?: string;

  /**
   * Display order for sorting palace rooms
   */
  displayOrder?: number;

  /**
   * Portals to other palaces
   */
  portals: PalacePortal[];
}

/**
 * Options for creating a new palace room
 */
export interface CreatePalaceRoomOptions {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  displayOrder?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Options for updating a palace room
 */
export interface UpdatePalaceRoomOptions {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  displayOrder?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Result of palace room operations
 */
export interface PalaceRoomOperationResult {
  success: boolean;
  palaceRoom?: PalaceRoom;
  error?: string;
}
