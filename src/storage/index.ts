/**
 * Storage module exports
 * Provides a flexible storage system for reading records and bookmarks
 */

// Core storage manager
export { ReadingRecordManager } from './ReadingRecordManager';

// Storage adapters
export { MemoryReadingRecordAdapter } from './adapters/memory';
export { LocalStorageReadingRecordAdapter } from './adapters/localStorage';

// Types and interfaces
export type {
  ReadingRecordAdapter,
  StorageCapabilities,
  StorageConfig,
  StorageStats,
  StorageResult,
  StorageEvents,
  VisitQuery,
  BookmarkQuery,
} from './types';

// Re-export core types for convenience
export type {
  AlexandriaVisit,
  AlexandriaBookmark,
  AlexandriaLibraryCard,
  AlexandriaDocumentVersion,
  AlexandriaBookmarkedDocument,
} from '../types/alexandria-state';