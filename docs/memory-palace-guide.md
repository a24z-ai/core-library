# MemoryPalace Guide

## What is MemoryPalace?

MemoryPalace is the core class for managing documentation, notes, and CodebaseViews within a single repository. It provides a context management system where knowledge about your codebase is anchored to specific files and organized through views.

## Basic Usage

```typescript
import { MemoryPalace, NodeFileSystemAdapter } from '@a24z/core-library';

// Create filesystem adapter
const fsAdapter = new NodeFileSystemAdapter();

// Initialize for a repository
const palace = new MemoryPalace(fsAdapter, '/path/to/repo');
```

## Core Functionality

### Working with CodebaseViews

Access and validate the organization of your codebase:

```typescript
// List all available views
const views = palace.listViews();

// Get a specific view by ID
const authView = palace.getView('authentication-system');

// Validate a view's file references
const validation = palace.validateView(authView);
if (!validation.valid) {
  console.log('View has issues:', validation.issues);
}

// Save a new or updated view
palace.saveView(newView);
```

### Managing Notes

Create notes anchored to specific files to augment your CodebaseViews:

```typescript
// Save a note about implementation details
const note = palace.saveNote({
  note: 'JWT tokens expire after 24 hours, refresh token needed for renewal',
  anchors: ['src/auth/jwt.ts', 'src/middleware/auth.ts'],
  tags: ['authentication', 'security', 'jwt'],
  confidence: 'high',
  type: 'explanation'
});

// Retrieve notes for a specific file
const notes = palace.getNotesForPath('src/auth/jwt.ts');

// List all notes in the repository
const allNotes = palace.listNotes();

// Delete a note by ID
palace.deleteNote(noteId);
```

### Repository Configuration

Access repository-specific configuration and guidance:

```typescript
// Get repository guidance for note-taking
const guidance = palace.getGuidance();

// Get configuration limits
const config = palace.getConfiguration();
console.log(`Max note length: ${config.limits.noteMaxLength}`);

// Get all tags used in the repository
const tags = palace.getUsedTags();
```

## Key Concepts

### Anchored Notes
Notes are "anchored" to specific files or directories, creating explicit connections between documentation and code. When code moves or is deleted, you'll know which notes are affected.

### Spatial Organization
The "palace" metaphor comes from the method of loci - a memory technique using spatial visualization. Your codebase becomes a navigable space where knowledge is stored in specific locations.

### File System Abstraction
MemoryPalace uses a `FileSystemAdapter` for all I/O operations, allowing it to work in different environments (Node.js, browser, testing).

## Common Patterns

### Documenting Complex Logic
```typescript
palace.saveNote({
  note: 'Retry logic uses exponential backoff: 1s, 2s, 4s, 8s, then fails',
  anchors: ['src/utils/retry.ts'],
  tags: ['pattern', 'error-handling'],
  type: 'explanation',
  confidence: 'high'
});
```

### Recording Decisions
```typescript
palace.saveNote({
  note: 'Chose Redis over Memcached for session storage due to persistence needs',
  anchors: ['src/config/cache.ts'],
  tags: ['decision', 'architecture'],
  type: 'decision',
  confidence: 'high'
});
```

### Marking Technical Debt
```typescript
palace.saveNote({
  note: 'TODO: This synchronous operation blocks the event loop, needs refactoring',
  anchors: ['src/handlers/processData.ts'],
  tags: ['tech-debt', 'performance'],
  type: 'issue',
  confidence: 'medium'
});
```

## Error Handling

MemoryPalace operations are generally safe and return null/undefined on failure:

```typescript
// Returns null if save fails
const note = palace.saveNote({ /* ... */ });
if (!note) {
  console.error('Failed to save note');
}

// Returns undefined if view doesn't exist
const view = palace.getView('nonexistent');
if (!view) {
  console.error('View not found');
}
```

## Storage Location

MemoryPalace stores all data in the `.alexandria` directory within your repository:
- `.alexandria/notes/` - Anchored notes organized by date
- `.alexandria/views/` - CodebaseView definitions
- `.alexandria/configuration.json` - Repository configuration

## Full API

For complete method signatures and advanced usage, see:
- [MemoryPalace Implementation](src/MemoryPalace.ts)
- [TypeScript Types](src/pure-core/types/index.ts)

## Related Documentation

- [CodebaseView Concept](codebase-view-concept.md) - Understanding spatial code organization
- [Adapter Architecture](adapter-architecture.md) - Using different file system adapters

---
*Last reviewed: 2025-09-23 - Document confirmed to be up-to-date with current implementation.*