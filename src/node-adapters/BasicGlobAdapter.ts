/**
 * Basic glob adapter implementation without external dependencies
 *
 * This provides a simple fallback implementation that handles basic glob patterns
 * using only Node.js built-in modules. It supports:
 * - Basic wildcards (*, **)
 * - File extensions (*.md)
 * - Multiple extensions ({md,mdx})
 * - Ignore patterns
 *
 * For advanced glob features, users should install globby and use NodeGlobAdapter.
 */
import * as fs from 'fs';
import * as path from 'path';
import { GlobAdapter, GlobOptions } from '../pure-core/abstractions/glob';

export class BasicGlobAdapter implements GlobAdapter {
  async findFiles(patterns: string[], options?: GlobOptions): Promise<string[]> {
    return this.findFilesSync(patterns, options);
  }

  findFilesSync(patterns: string[], options?: GlobOptions): string[] {
    const cwd = options?.cwd || process.cwd();
    const ignore = options?.ignore || [];
    const onlyFiles = options?.onlyFiles !== false;
    const dot = options?.dot || false;
    const gitignore = options?.gitignore || false;

    // Convert patterns to regex
    const patternRegexes = patterns.map((pattern) => this.globToRegex(pattern));
    const ignoreRegexes = ignore.map((pattern) => this.globToRegex(pattern));

    // Add .gitignore patterns if requested
    let gitignorePatterns: RegExp[] = [];
    if (gitignore) {
      gitignorePatterns = this.loadGitignorePatterns(cwd);
    }

    // Recursively find all paths
    const allPaths = this.getAllPaths(cwd);

    // Filter based on patterns and options
    const matchedPaths = allPaths.filter((fullPath) => {
      // Get relative path for pattern matching
      const relativePath = path.relative(cwd, fullPath);

      // Skip empty relative path (the cwd itself)
      if (!relativePath) return false;

      // Check gitignore patterns
      if (gitignorePatterns.some((regex) => regex.test(relativePath))) {
        return false;
      }

      // Check if it matches any ignore pattern
      if (ignoreRegexes.some((regex) => regex.test(relativePath))) {
        return false;
      }

      // Check if it's a file or directory
      if (onlyFiles && fs.statSync(fullPath).isDirectory()) {
        return false;
      }

      // Check dotfiles
      if (!dot && this.isDotfile(relativePath)) {
        return false;
      }

      // Check if it matches any of the patterns
      return patternRegexes.some((regex) => regex.test(relativePath));
    });

    // Return relative paths
    return matchedPaths.map((p) => path.relative(cwd, p));
  }

  private getAllPaths(dir: string, basePath?: string): string[] {
    const paths: string[] = [];
    const base = basePath || dir;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip common directories to ignore
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        paths.push(fullPath);

        if (entry.isDirectory()) {
          // Recursively get paths from subdirectories
          paths.push(...this.getAllPaths(fullPath, base));
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return paths;
  }

  private isDotfile(relativePath: string): boolean {
    const segments = relativePath.split(path.sep);
    return segments.some((segment) => segment.startsWith('.') && segment !== '.');
  }

  private loadGitignorePatterns(cwd: string): RegExp[] {
    const patterns: RegExp[] = [];
    const gitignorePath = path.join(cwd, '.gitignore');

    if (fs.existsSync(gitignorePath)) {
      try {
        const content = fs.readFileSync(gitignorePath, 'utf8');
        const lines = content.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          // Skip comments and empty lines
          if (!trimmed || trimmed.startsWith('#')) continue;

          // Convert gitignore pattern to regex
          patterns.push(this.gitignoreToRegex(trimmed));
        }
      } catch (error) {
        // Failed to read .gitignore
      }
    }

    return patterns;
  }

  private gitignoreToRegex(pattern: string): RegExp {
    let regex = pattern;

    // Handle negation (we'll skip these for simplicity)
    if (regex.startsWith('!')) {
      return new RegExp('$.^'); // Never matches
    }

    // Remove leading/trailing slashes
    regex = regex.replace(/^\//, '').replace(/\/$/, '');

    // Escape special regex characters
    regex = regex.replace(/[.+^${}()|[\]\\]/g, '\\$&');

    // Convert gitignore wildcards to regex
    regex = regex
      .replace(/\*\*/g, '___DOUBLE_STAR___')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/___DOUBLE_STAR___/g, '.*');

    // Match anywhere in the path
    return new RegExp('(^|/)' + regex + '($|/)');
  }

  private globToRegex(pattern: string): RegExp {
    // Handle brace expansion first (before escaping)
    let expandedPattern = pattern.replace(/\{([^}]+)\}/g, (match, group) => {
      const options = group.split(',');
      return '___BRACE_START___' + options.join('___BRACE_OR___') + '___BRACE_END___';
    });

    // Simple glob to regex conversion
    let regex = expandedPattern
      // Escape special regex characters except * and ?
      .replace(/[.+^${}()[\]\\|]/g, '\\$&')
      // Convert ** to match any depth (including zero depth)
      .replace(/\*\*/g, '___DOUBLE_STAR___')
      // Convert * to match anything except /
      .replace(/\*/g, '[^/]*')
      // Convert ? to match single character
      .replace(/\?/g, '[^/]')
      // Restore ** pattern - match any number of path segments including none
      .replace(/___DOUBLE_STAR___\//g, '(.*\\/)?')
      .replace(/\/___DOUBLE_STAR___/g, '(\\/.*)?')
      .replace(/___DOUBLE_STAR___/g, '.*')
      // Restore brace expansion as regex alternation
      .replace(/___BRACE_START___/g, '(')
      .replace(/___BRACE_OR___/g, '|')
      .replace(/___BRACE_END___/g, ')');

    return new RegExp('^' + regex + '$');
  }
}