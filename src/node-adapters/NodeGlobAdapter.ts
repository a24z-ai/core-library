/**
 * Node.js implementation of GlobAdapter using globby
 *
 * This adapter uses the globby library for pattern matching.
 * It should only be imported in Node.js environments where globby is available.
 */
import { globby, globbySync, type Options } from 'globby';
import { GlobAdapter, GlobOptions } from '../pure-core/abstractions/glob';

/**
 * Node.js implementation using globby library
 */
export class NodeGlobAdapter implements GlobAdapter {
  async findFiles(patterns: string[], options?: GlobOptions): Promise<string[]> {
    const globbyOptions: Options = {
      ...(options?.cwd && { cwd: options.cwd }),
      ...(options?.ignore && { ignore: options.ignore }),
      ...(options?.gitignore !== undefined && { gitignore: options.gitignore }),
      ...(options?.dot !== undefined && { dot: options.dot }),
      ...(options?.onlyFiles !== undefined && { onlyFiles: options.onlyFiles }),
    };

    // Ensure we get strings, not Entry objects
    return globby(patterns, globbyOptions) as Promise<string[]>;
  }

  findFilesSync(patterns: string[], options?: GlobOptions): string[] {
    const globbyOptions: Options = {
      ...(options?.cwd && { cwd: options.cwd }),
      ...(options?.ignore && { ignore: options.ignore }),
      ...(options?.gitignore !== undefined && { gitignore: options.gitignore }),
      ...(options?.dot !== undefined && { dot: options.dot }),
      ...(options?.onlyFiles !== undefined && { onlyFiles: options.onlyFiles }),
    };

    // Ensure we get strings, not Entry objects
    return globbySync(patterns, globbyOptions) as string[];
  }

  matchesPath(patterns: string[] | undefined, candidate: string): boolean {
    if (!patterns || patterns.length === 0) {
      return false;
    }

    return patterns.some((pattern) => globToRegex(pattern).test(candidate));
  }
}

function globToRegex(pattern: string): RegExp {
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '___DOUBLE_STAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/___DOUBLE_STAR___\//g, '(.*\\/)?')
    .replace(/\/___DOUBLE_STAR___/g, '(\\/.*)?')
    .replace(/___DOUBLE_STAR___/g, '.*');

  regex = regex.replace(/\{([^}]+)\}/g, (_match, group) => {
    const options = group.split(',');
    return '(' + options.join('|') + ')';
  });

  return new RegExp('^' + regex + '$');
}
