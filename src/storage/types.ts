/**
 * Storage abstraction types for Alexandria reading state
 * Provides adapter pattern for swapping storage backends
 */

import type {
  AlexandriaVisit,
  AlexandriaBookmark,
  AlexandriaLibraryCard,
} from "../types/alexandria-state";

/**
 * Query options for retrieving visits
 */
export interface VisitQuery {
  volumeId?: string;
  chapterId?: string;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Query options for retrieving bookmarks
 */
export interface BookmarkQuery {
  visitId?: string;
  volumeId?: string;
  chapterId?: string;
  createdAfter?: Date;
  limit?: number;
}

/**
 * Storage operation results
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StorageStats {
  totalVisits: number;
  totalBookmarks: number;
  storageUsed: number; // in bytes
  oldestVisit?: Date;
  newestVisit?: Date;
}

/**
 * Abstract interface for Alexandria reading record adapters
 * Implement this interface for different storage backends
 */
export interface ReadingRecordAdapter {
  // Initialization
  initialize(): Promise<void>;
  isReady(): boolean;

  // Library Card (user preferences and metadata)
  getLibraryCard(
    userId: string,
  ): Promise<StorageResult<AlexandriaLibraryCard | null>>;
  saveLibraryCard(
    libraryCard: AlexandriaLibraryCard,
  ): Promise<StorageResult<void>>;

  // Visit Management
  createVisit(visit: AlexandriaVisit): Promise<StorageResult<AlexandriaVisit>>;
  getVisit(visitId: string): Promise<StorageResult<AlexandriaVisit | null>>;
  updateVisit(
    visitId: string,
    updates: Partial<AlexandriaVisit>,
  ): Promise<StorageResult<void>>;
  deleteVisit(visitId: string): Promise<StorageResult<void>>;
  queryVisits(query: VisitQuery): Promise<StorageResult<AlexandriaVisit[]>>;

  // Bookmark Management
  createBookmark(
    visitId: string,
    bookmark: AlexandriaBookmark,
  ): Promise<StorageResult<AlexandriaBookmark>>;
  getBookmark(
    bookmarkId: string,
  ): Promise<StorageResult<AlexandriaBookmark | null>>;
  updateBookmark(
    bookmarkId: string,
    updates: Partial<AlexandriaBookmark>,
  ): Promise<StorageResult<void>>;
  deleteBookmark(bookmarkId: string): Promise<StorageResult<void>>;
  queryBookmarks(
    query: BookmarkQuery,
  ): Promise<StorageResult<AlexandriaBookmark[]>>;

  // Maintenance
  cleanup(olderThan: Date): Promise<StorageResult<number>>; // returns number of deleted items
  getStats(): Promise<StorageResult<StorageStats>>;
  export(): Promise<StorageResult<string>>; // JSON export
  import(data: string): Promise<StorageResult<void>>;

  // Storage-specific methods
  getName(): string;
  getCapabilities(): StorageCapabilities;
}

/**
 * Capabilities that different storage adapters may support
 */
export interface StorageCapabilities {
  maxStorageSize?: number; // in bytes, undefined = unlimited
  supportsTransactions: boolean;
  supportsIndexing: boolean;
  supportsBackup: boolean;
  isVolatile: boolean; // true if data is lost on browser refresh
}

/**
 * Configuration for storage adapters
 */
export interface StorageConfig {
  adapter: "localStorage" | "indexedDB" | "memory";
  options?: {
    dbName?: string;
    version?: number;
    keyPrefix?: string;
    maxEntries?: number;
    cleanupInterval?: number;
  };
}

/**
 * Events emitted by storage adapters
 */
export interface StorageEvents {
  "visit:created": { visit: AlexandriaVisit };
  "visit:updated": { visitId: string; changes: Partial<AlexandriaVisit> };
  "visit:deleted": { visitId: string };
  "bookmark:created": { bookmark: AlexandriaBookmark };
  "bookmark:updated": {
    bookmarkId: string;
    changes: Partial<AlexandriaBookmark>;
  };
  "bookmark:deleted": { bookmarkId: string };
  "storage:error": { error: Error; operation: string };
  "storage:cleanup": { deletedCount: number };
}
