import { GlobAdapter } from '../../pure-core/abstractions/glob';

/**
 * Utility helper for rules to determine if a path matches any provided patterns.
 * Delegates to the GlobAdapter when available so individual environments control glob semantics.
 */
export function matchesPatterns(
  globAdapter: GlobAdapter | undefined,
  patterns: string[] | undefined,
  candidate: string
): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  if (globAdapter?.matchesPath) {
    return globAdapter.matchesPath(patterns, candidate);
  }

  return patterns.includes(candidate);
}
