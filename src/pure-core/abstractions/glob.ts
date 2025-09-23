/**
 * Pure glob/pattern matching abstraction interfaces
 *
 * These interfaces define the contract for file pattern matching operations
 * without any platform-specific implementations. This allows the pure-core
 * to work with any glob implementation (globby, fast-glob, minimatch, etc.)
 */

export interface GlobOptions {
  /**
   * Current working directory for glob patterns
   */
  cwd?: string;

  /**
   * Patterns to exclude from results
   */
  ignore?: string[];

  /**
   * Whether to respect .gitignore rules
   */
  gitignore?: boolean;

  /**
   * Include dotfiles in results
   */
  dot?: boolean;

  /**
   * Return only files (not directories)
   */
  onlyFiles?: boolean;
}

export interface GlobAdapter {
  /**
   * Find files matching the given patterns
   * @param patterns - Array of glob patterns to match
   * @param options - Options for glob matching
   * @returns Promise resolving to array of matching file paths
   */
  findFiles(patterns: string[], options?: GlobOptions): Promise<string[]>;

  /**
   * Synchronous version of findFiles
   * @param patterns - Array of glob patterns to match
   * @param options - Options for glob matching
   * @returns Array of matching file paths
   */
  findFilesSync?(patterns: string[], options?: GlobOptions): string[];

  /**
   * Check whether a candidate path matches any of the provided patterns.
   * Implementations may delegate to their underlying glob engines.
   * @param patterns - Glob patterns to evaluate
   * @param candidate - Path to test against the patterns
   */
  matchesPath?(patterns: string[] | undefined, candidate: string): boolean;
}
