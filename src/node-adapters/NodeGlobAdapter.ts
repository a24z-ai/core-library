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
}