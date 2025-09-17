# Globby Migration Guide

## Breaking Change: All External Dependencies Removed

As of version 0.2.0, `@a24z/core-library` has **ZERO runtime dependencies**! Both `globby` and `ignore` have been removed. This change was made to:
- Eliminate ALL external dependencies (zero dependency footprint!)
- Allow users to choose their preferred glob implementation
- Provide better testability through dependency injection

## What Changed?

### Before
The library directly imported and used `globby` for pattern matching in rules like `document-organization`.

### After
The library now uses a `GlobAdapter` abstraction with a built-in `BasicGlobAdapter` as the default implementation.

## Migration Options

### Option 1: Use the Built-in BasicGlobAdapter (Default)

No action required! The library now includes `BasicGlobAdapter` which handles common glob patterns without external dependencies:

```typescript
import { LibraryRulesEngine } from '@a24z/core-library';

// Uses BasicGlobAdapter by default
const engine = new LibraryRulesEngine();
```

**BasicGlobAdapter supports:**
- Basic wildcards (`*`, `**`)
- File extensions (`*.md`)
- Multiple extensions (`{md,mdx}`)
- Ignore patterns
- `.gitignore` support

### Option 2: Install and Use Globby (Advanced Features)

If you need advanced glob features, install `globby` separately:

```bash
npm install globby
# or
yarn add globby
# or
bun add globby
```

Then create your own adapter:

```typescript
import { globby, globbySync } from 'globby';
import { GlobAdapter, GlobOptions } from '@a24z/core-library';

class GlobbyAdapter implements GlobAdapter {
  async findFiles(patterns: string[], options?: GlobOptions): Promise<string[]> {
    const globbyOptions: any = {
      ...(options?.cwd && { cwd: options.cwd }),
      ...(options?.ignore && { ignore: options.ignore }),
      ...(options?.gitignore !== undefined && { gitignore: options.gitignore }),
      ...(options?.dot !== undefined && { dot: options.dot }),
      ...(options?.onlyFiles !== undefined && { onlyFiles: options.onlyFiles }),
    };
    return globby(patterns, globbyOptions);
  }

  findFilesSync(patterns: string[], options?: GlobOptions): string[] {
    const globbyOptions: any = {
      ...(options?.cwd && { cwd: options.cwd }),
      ...(options?.ignore && { ignore: options.ignore }),
      ...(options?.gitignore !== undefined && { gitignore: options.gitignore }),
      ...(options?.dot !== undefined && { dot: options.dot }),
      ...(options?.onlyFiles !== undefined && { onlyFiles: options.onlyFiles }),
    };
    return globbySync(patterns, globbyOptions);
  }
}

// Use with rules engine
import { LibraryRulesEngine } from '@a24z/core-library';

const globAdapter = new GlobbyAdapter();
const engine = new LibraryRulesEngine(globAdapter);
```

### Option 3: Use Alternative Glob Libraries

You can use any glob library by implementing the `GlobAdapter` interface:

```typescript
import { glob } from 'fast-glob'; // or any other glob library
import { GlobAdapter, GlobOptions } from '@a24z/core-library';

class FastGlobAdapter implements GlobAdapter {
  async findFiles(patterns: string[], options?: GlobOptions): Promise<string[]> {
    // Map options to fast-glob format
    return glob(patterns, {
      cwd: options?.cwd,
      ignore: options?.ignore,
      dot: options?.dot,
      onlyFiles: options?.onlyFiles,
    });
  }
}
```

## Testing

For testing, use the provided `InMemoryGlobAdapter`:

```typescript
import { InMemoryFileSystemAdapter } from '@a24z/core-library/tests/test-adapters/InMemoryFileSystemAdapter';
import { InMemoryGlobAdapter } from '@a24z/core-library/tests/test-adapters/InMemoryGlobAdapter';

const fs = new InMemoryFileSystemAdapter();
const globAdapter = new InMemoryGlobAdapter(fs);
const engine = new LibraryRulesEngine(globAdapter);
```

## When to Use Each Option

- **BasicGlobAdapter**: Suitable for most use cases with standard glob patterns
- **Custom Globby Adapter**: When you need advanced features like extended globs or specific globby options
- **Alternative Libraries**: When you have existing code using other glob libraries or specific performance requirements

## API Reference

### GlobAdapter Interface

```typescript
interface GlobAdapter {
  findFiles(patterns: string[], options?: GlobOptions): Promise<string[]>;
  findFilesSync?(patterns: string[], options?: GlobOptions): string[];
}

interface GlobOptions {
  cwd?: string;           // Current working directory
  ignore?: string[];      // Patterns to exclude
  gitignore?: boolean;    // Respect .gitignore
  dot?: boolean;          // Include dotfiles
  onlyFiles?: boolean;    // Return only files (not directories)
}
```

## Questions or Issues?

Please report any issues or questions at: https://github.com/a24z-ai/core-library/issues