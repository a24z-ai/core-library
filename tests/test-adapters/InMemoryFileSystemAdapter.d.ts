/**
 * In-memory implementation of FileSystemAdapter for testing
 * This allows tests to run without touching the real filesystem,
 * making them faster and more reliable.
 */
import { FileSystemAdapter } from '../../src/pure-core/abstractions/filesystem';
export declare class InMemoryFileSystemAdapter implements FileSystemAdapter {
    private files;
    private binaryFiles;
    exists(path: string): boolean;
    readFile(path: string): string;
    writeFile(path: string, content: string): void;
    deleteFile(path: string): void;
    readBinaryFile(path: string): Uint8Array;
    writeBinaryFile(path: string, content: Uint8Array): void;
    createDir(path: string): void;
    readDir(path: string): string[];
    deleteDir(path: string): void;
    join(...paths: string[]): string;
    dirname(path: string): string;
    isAbsolute(path: string): boolean;
    relative(from: string, to: string): string;
    isDirectory(path: string): boolean;
    normalizeRepositoryPath(inputPath: string): string;
    findProjectRoot(inputPath: string): string;
    getRepositoryName(repositoryPath: string): string;
    clear(): void;
    getFiles(): Map<string, string>;
    setupTestRepo(repoPath: string): void;
    debug(): void;
}
//# sourceMappingURL=InMemoryFileSystemAdapter.d.ts.map