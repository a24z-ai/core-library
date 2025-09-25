/**
 * PalacePortal types for cross-palace references
 * Enables linking and referencing content from other memory palaces
 */

// Import types that portals can reference
import type { PalaceRoom } from './palace-room';
import type { CodebaseView, StoredAnchoredNote } from './index';
import type { DrawingMetadata } from '../stores/DrawingStore';

/**
 * Types of repository references
 */
export type PortalTargetType = 'local' | 'git' | 'url';

/**
 * How the portal content should be displayed
 */
export type PortalDisplayMode = 'linked' | 'embedded' | 'mirror';

/**
 * Synchronization strategy for portal content
 */
export type PortalSyncStrategy = 'manual' | 'auto' | 'on-demand';

/**
 * Reference type for what to include from the target palace
 */
export type PortalReferenceType = 'full' | 'selective';

/**
 * Status of a portal connection
 */
export type PortalStatus = 'active' | 'broken' | 'pending' | 'unauthorized';

/**
 * Target repository configuration for a portal
 */
export interface PortalTarget {
  /**
   * Type of repository reference
   */
  type: PortalTargetType;

  /**
   * Local file system path (for 'local' type)
   * Example: /Users/username/projects/other-repo
   */
  path?: string;

  /**
   * Git repository URL (for 'git' type)
   * Example: https://github.com/user/repo
   */
  gitUrl?: string;

  /**
   * Git branch or tag to reference
   * Default: main/master
   */
  branch?: string;

  /**
   * Specific commit SHA to pin to
   * If provided, overrides branch
   */
  commit?: string;

  /**
   * Generic URL (for 'url' type)
   * Could be a web API or other remote palace
   */
  url?: string;
}

/**
 * Selective references configuration
 */
export interface PortalReferences {
  /**
   * Specific room IDs to reference
   */
  roomIds?: string[];

  /**
   * Specific codebase view IDs to reference
   */
  viewIds?: string[];

  /**
   * Note tag patterns to include (supports wildcards)
   * Example: ["architecture/*", "api-docs"]
   */
  notePatterns?: string[];

  /**
   * Drawing name patterns to include
   */
  drawingPatterns?: string[];
}

/**
 * A portal linking to another palace
 */
export interface PalacePortal {
  /**
   * Unique identifier for this portal
   */
  id: string;

  /**
   * Human-readable name for the portal
   */
  name: string;

  /**
   * Description of what this portal connects to
   */
  description?: string;

  /**
   * Target repository configuration
   */
  target: PortalTarget;

  /**
   * What to reference from the target palace
   */
  referenceType: PortalReferenceType;

  /**
   * Selective references (when referenceType is 'selective')
   */
  references?: PortalReferences;

  /**
   * How to display portal content in the current palace
   */
  displayMode: PortalDisplayMode;

  /**
   * Synchronization strategy
   */
  syncStrategy?: PortalSyncStrategy;

  /**
   * Current status of the portal
   */
  status: PortalStatus;

  /**
   * Last error message if status is 'broken'
   */
  lastError?: string;

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
}

/**
 * Options for creating a portal
 */
export interface CreatePortalOptions {
  name: string;
  description?: string;
  target: PortalTarget;
  referenceType?: PortalReferenceType;
  references?: PortalReferences;
  displayMode?: PortalDisplayMode;
  syncStrategy?: PortalSyncStrategy;
  metadata?: Record<string, unknown>;
}

/**
 * Options for importing content from a portal
 */
export interface ImportPortalOptions {
  /**
   * Whether to import rooms
   */
  importRooms?: boolean;

  /**
   * Whether to import views
   */
  importViews?: boolean;

  /**
   * Whether to import notes
   */
  importNotes?: boolean;

  /**
   * Whether to import drawings
   */
  importDrawings?: boolean;

  /**
   * Prefix to add to imported content IDs to avoid conflicts
   */
  idPrefix?: string;

  /**
   * Whether to overwrite existing content with same IDs
   */
  overwrite?: boolean;

  /**
   * Whether to merge with existing content
   */
  merge?: boolean;
}

/**
 * Result of portal resolution
 */
export interface PortalContent {
  /**
   * Portal ID
   */
  portalId: string;

  /**
   * Whether the resolution was successful
   */
  success: boolean;

  /**
   * Error message if resolution failed
   */
  error?: string;

  /**
   * Resolved content from the portal
   * These would be the actual types from the target palace
   */
  content?: {
    rooms?: PalaceRoom[];
    views?: CodebaseView[];
    notes?: StoredAnchoredNote[];
    drawings?: DrawingMetadata[];
  };

  /**
   * Metadata about the target palace
   */
  targetMetadata?: {
    repositoryPath?: string;
    alexandriaVersion?: string;
    lastModified?: string;
  };
}

/**
 * Resource types for palace URIs
 */
export type PalaceResourceType = 'room' | 'view' | 'note' | 'drawing';

/**
 * Cross-palace URI components
 */
export interface PalaceURI {
  /**
   * Protocol (always 'palace')
   */
  protocol: 'palace';

  /**
   * Host/repository identifier
   * Examples: 'local', 'github.com/user/repo', 'gitlab.com/user/repo'
   */
  host: string;

  /**
   * Resource type
   */
  resourceType: PalaceResourceType;

  /**
   * Resource ID
   */
  resourceId: string;

  /**
   * Optional query parameters
   */
  query?: Record<string, string>;

  /**
   * Optional fragment/anchor
   */
  fragment?: string;
}

/**
 * Reference status for cross-palace references
 */
export type ReferenceStatus = 'active' | 'broken' | 'pending';

/**
 * Cross-palace reference
 */
export interface CrossPalaceReference {
  /**
   * URI string (e.g., 'palace://github.com/user/repo/room/room-id')
   */
  uri: string;

  /**
   * Parsed URI components
   */
  parsed?: PalaceURI;

  /**
   * Reference status
   */
  status: ReferenceStatus;

  /**
   * Error message if status is 'broken'
   */
  error?: string;
}