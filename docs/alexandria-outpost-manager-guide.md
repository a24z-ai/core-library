# AlexandriaOutpostManager Guide

## What is AlexandriaOutpostManager?

AlexandriaOutpostManager is the high-level class for managing multiple repositories and their Alexandria configurations. It provides a unified interface for registering, discovering, and working with multiple projects that use the Alexandria documentation system.

## Basic Usage

```typescript
import { AlexandriaOutpostManager, NodeFileSystemAdapter } from '@a24z/core-library';

// Create filesystem adapter
const fsAdapter = new NodeFileSystemAdapter();

// Initialize the manager (automatically uses user's home directory)
const manager = new AlexandriaOutpostManager(fsAdapter);
```

## Core Functionality

### Managing Repositories

Register and manage multiple repositories in your global registry:

```typescript
// Register a new repository
const repo = await manager.registerRepository('my-project', '/path/to/my-project');

// Get all registered repositories
const repositories = await manager.getAllRepositories();

// Get a specific repository by name
const myRepo = await manager.getRepository('my-project');

// Remove a repository from the registry
const removed = await manager.removeRepository('my-project');
```

### Repository Information

Access metadata and views for registered repositories:

```typescript
// Get repository with all its metadata
const repo = await manager.getRepository('my-project');
if (repo) {
  console.log(`${repo.name} at ${repo.path}`);
  console.log(`Has ${repo.viewCount} views`);
  console.log(`Last updated: ${repo.lastUpdated}`);

  // Access view summaries
  repo.views.forEach(view => {
    console.log(`- ${view.name}: ${view.cellCount} cells`);
  });
}

// Get all entries with full AlexandriaEntry data (includes local paths)
const entries = manager.getAllEntries();
entries.forEach(entry => {
  console.log(`${entry.name} at ${entry.path}`);
});
```

### Serving Repository Data

Transform repository data for API responses or UI display:

```typescript
// Get all repositories with their view summaries
const repos = await manager.getAllRepositories();

// Each repository includes:
// - Basic metadata (name, path, remote URL)
// - View summaries (lightweight representations)
// - Statistics (view count, has views flag)
// - Timestamps (registered at, last updated)
```

## Key Concepts

### Global Registry
The manager maintains a global registry of all your Alexandria-enabled repositories at `~/.alexandria/projects.json`. This allows tools to discover and work with your documented projects.

### Repository vs Project
In the context of AlexandriaOutpostManager:
- **Repository**: A git repository with Alexandria documentation
- **Project**: A registered entry in the global registry
These terms are often used interchangeably.

### View Summaries
The manager works with lightweight view summaries rather than full CodebaseViews, making it efficient for listing and browsing multiple repositories.

## Common Patterns

### Discovery Workflow
```typescript
// Find all repositories with documentation
const repos = await manager.getAllRepositories();
const documented = repos.filter(r => r.hasViews);

console.log(`Found ${documented.length} documented repositories`);
```

### Registration Workflow
```typescript
// Register a new project
const projectPath = '/path/to/new-project';
const projectName = 'new-project';

try {
  const repo = await manager.registerRepository(projectName, projectPath);
  console.log(`Registered ${repo.name} with ${repo.viewCount} views`);
} catch (error) {
  console.error('Registration failed:', error);
}
```

### API Integration
```typescript
// Prepare data for API response
const repos = await manager.getAllRepositories();
const apiResponse = {
  repositories: repos.map(repo => ({
    id: repo.id,
    name: repo.name,
    path: repo.path,
    viewCount: repo.viewCount,
    hasViews: repo.hasViews,
    lastUpdated: repo.lastUpdated
  }))
};
```

## Storage Location

AlexandriaOutpostManager stores the global registry in your home directory:
- `~/.alexandria/projects.json` - Global project registry

Each registered repository maintains its own Alexandria data:
- `{repo}/.alexandria/views/` - CodebaseView definitions
- `{repo}/.alexandria/notes/` - Anchored notes

## Error Handling

Manager operations are async and may throw errors:

```typescript
try {
  const repo = await manager.registerRepository(name, path);
} catch (error) {
  // Handle registration errors
  // - Invalid path
  // - Repository already registered
  // - Permission issues
}
```

## Integration with MemoryPalace

Use AlexandriaOutpostManager to discover repositories, then MemoryPalace to work with their content:

```typescript
// Get repository from manager
const repo = await manager.getRepository('my-project');

if (repo && repo.path) {
  // Use MemoryPalace for detailed operations
  const palace = new MemoryPalace(fsAdapter, repo.path);
  const notes = palace.listNotes();
  const views = palace.listViews();
}
```

## Full API

For complete method signatures and advanced usage, see:
- [AlexandriaOutpostManager Implementation](src/projects-core/AlexandriaOutpostManager.ts)
- [Repository Types](src/pure-core/types/repository.ts)

## Related Documentation

- [MemoryPalace Guide](memory-palace-guide.md) - Working with individual repositories
- [CodebaseView Summaries](codebase-view-summaries.md) - Understanding view summaries