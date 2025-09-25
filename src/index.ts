/**
 * @a24z/core-library
 * 
 * Core library exports for the a24z ecosystem.
 * Provides essential functionality for managing notes, views, and configurations.
 */

// Essential types from pure-core
export type {
  // Core note types
  StoredAnchoredNote,
  AnchoredNoteWithPath,
  MemoryPalaceConfiguration,
  StaleAnchoredNote,

  // Path validation types
  ValidatedRepositoryPath,
  ValidatedRelativePath,

  // CodebaseView types
  CodebaseView,
  CodebaseViewCell,
  CodebaseViewFileCell,
  CodebaseViewScope,
  CodebaseViewLinks,
  ViewValidationResult,
  PatternValidationResult,
  FileListValidationResult,
} from './pure-core/types';

// Repository and Alexandria types
export type {
  ValidatedAlexandriaPath,
  AlexandriaRepository,
  AlexandriaEntry,
  AlexandriaRepositoryRegistry,
  GithubRepository,
} from './pure-core/types/repository';

// CodebaseView summary types
export type { CodebaseViewSummary } from './pure-core/types/summary';
export {
  extractCodebaseViewSummary,
  extractCodebaseViewSummaries,
} from './pure-core/types/summary';

// Validation types
export type { 
  ValidationResult as CodebaseValidationResult,
  ValidationIssue 
} from './pure-core/validation/CodebaseViewValidator';

// Config types
export type { ValidationResult as ConfigValidationResult } from './config/types';

// Filesystem adapter for dependency injection
export type { FileSystemAdapter } from './pure-core/abstractions/filesystem';
export { NodeFileSystemAdapter } from './node-adapters/NodeFileSystemAdapter';
export { InMemoryFileSystemAdapter } from './test-adapters/InMemoryFileSystemAdapter';

// Glob adapter for pattern matching
export type { GlobAdapter, GlobOptions } from './pure-core/abstractions/glob';
export { NodeGlobAdapter } from './node-adapters/NodeGlobAdapter';

// Primary API classes
export { MemoryPalace } from './MemoryPalace';

// Project management
export { ProjectRegistryStore } from './projects-core/ProjectRegistryStore';
export { AlexandriaOutpostManager } from './projects-core/AlexandriaOutpostManager';

// Store exports for direct access if needed
export { CodebaseViewsStore, generateViewIdFromName } from './pure-core/stores/CodebaseViewsStore';
export { DrawingStore } from './pure-core/stores/DrawingStore';
export type { DrawingMetadata } from './pure-core/stores/DrawingStore';

// Utilities and rules
export { LibraryRulesEngine } from './rules/index';
export { OverviewPathAutoFix } from './pure-core/autofixes/OverviewPathAutoFix';
export { ConfigValidator } from './config/validator';

// Rule types for CLI and external consumers
export type {
  LibraryRule,
  LibraryRuleSeverity,
  LibraryRuleCategory,
  LibraryRuleViolation,
  LibraryRuleContext,
  LibraryRuleSet,
  LibraryLintResult,
  FileInfo,
  GitFileHistory,
} from './rules/types';

// Configuration types
export type {
  AlexandriaConfig,
  ContextRule,
  DocumentOrganizationOptions,
  FilenameConventionOptions,
  StaleReferencesOptions,
  RequireReferencesOptions,
  RuleOptions,
  ProjectType,
  RuleSeverity,
  ReportingOutput,
  ReportingFormat,
  PriorityLevel,
  FixType,
  PriorityPattern,
  FilenameStyle,
  FilenameSeparator,
  FilenameCaseStyle,
} from './config/types';

// Constants
export { ALEXANDRIA_DIRS } from './constants/paths';
export { CONFIG_FILENAME } from './config/schema';

// Project utilities
export { hasAlexandriaWorkflow, hasMemoryNotes } from './projects-core/workflow-utils';

// ============================================================================
// Storage and Bookmarking System
// ============================================================================

// Storage manager and adapters
export { ReadingRecordManager } from './storage/ReadingRecordManager';
export { MemoryReadingRecordAdapter } from './storage/adapters/memory';
export { LocalStorageReadingRecordAdapter } from './storage/adapters/localStorage';

// Storage types
export type {
  ReadingRecordAdapter,
  StorageCapabilities,
  StorageConfig,
  StorageStats,
  StorageResult,
  StorageEvents,
  VisitQuery,
  BookmarkQuery,
} from './storage/types';

// Alexandria bookmark and state types
export type {
  AlexandriaVisit,
  AlexandriaBookmark,
  AlexandriaLibraryCard,
  AlexandriaDocumentVersion,
  AlexandriaBookmarkedDocument,
} from './types/alexandria-state';