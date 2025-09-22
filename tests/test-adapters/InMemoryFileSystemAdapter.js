/**
 * In-memory implementation of FileSystemAdapter for testing
 * This allows tests to run without touching the real filesystem,
 * making them faster and more reliable.
 */
export class InMemoryFileSystemAdapter {
    files = new Map();
    binaryFiles = new Map();
    exists(path) {
        return this.files.has(path) || this.binaryFiles.has(path) || this.isDirectory(path);
    }
    readFile(path) {
        if (!this.files.has(path)) {
            throw new Error(`File not found: ${path}`);
        }
        return this.files.get(path);
    }
    writeFile(path, content) {
        // Ensure parent directory exists in our tracking
        const dir = this.dirname(path);
        if (dir && dir !== '/' && dir !== path) {
            this.createDir(dir);
        }
        this.files.set(path, content);
    }
    deleteFile(path) {
        this.files.delete(path);
        this.binaryFiles.delete(path);
    }
    readBinaryFile(path) {
        if (!this.binaryFiles.has(path)) {
            throw new Error(`Binary file not found: ${path}`);
        }
        return this.binaryFiles.get(path);
    }
    writeBinaryFile(path, content) {
        // Ensure parent directory exists in our tracking
        const dir = this.dirname(path);
        if (dir && dir !== '/' && dir !== path) {
            this.createDir(dir);
        }
        this.binaryFiles.set(path, content);
    }
    createDir(path) {
        // In memory, directories are implicit
        // We track them by ensuring they appear in readDir results
        if (!path || path === '/')
            return;
        // Add a marker for the directory
        this.files.set(path + '/.dir', '');
    }
    readDir(path) {
        // Check if this path is actually a file (not a directory)
        if ((this.files.has(path) || this.binaryFiles.has(path)) && !path.endsWith('/.dir')) {
            throw new Error(`ENOTDIR: not a directory, scandir '${path}'`);
        }
        // Check if the directory exists
        if (!this.isDirectory(path)) {
            throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
        }
        const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
        const prefix = normalizedPath === '/' ? '' : `${normalizedPath}/`;
        const items = new Set();
        for (const filePath of this.files.keys()) {
            if (filePath.startsWith(prefix)) {
                const relativePath = filePath.slice(prefix.length);
                if (relativePath) {
                    // Skip .dir markers at the current level
                    if (relativePath === '.dir') {
                        continue;
                    }
                    // Check if this is a subdirectory .dir marker
                    if (relativePath.endsWith('/.dir')) {
                        // This indicates a subdirectory exists, add it without the .dir
                        const dirName = relativePath.slice(0, -5).split('/')[0];
                        if (dirName) {
                            items.add(dirName);
                        }
                    }
                    else {
                        // Get the first segment (either a file or directory name)
                        const firstSegment = relativePath.split('/')[0];
                        if (firstSegment && firstSegment !== '.dir') {
                            items.add(firstSegment);
                        }
                    }
                }
            }
        }
        // Also check binary files
        for (const filePath of this.binaryFiles.keys()) {
            if (filePath.startsWith(prefix)) {
                const relativePath = filePath.slice(prefix.length);
                if (relativePath) {
                    const parts = relativePath.split('/');
                    if (parts[0]) {
                        items.add(parts[0]);
                    }
                }
            }
        }
        return Array.from(items);
    }
    deleteDir(path) {
        // In memory, just remove all files in the directory
        const prefix = `${path}/`;
        for (const filePath of this.files.keys()) {
            if (filePath.startsWith(prefix) || filePath === path + '/.dir') {
                this.files.delete(filePath);
            }
        }
        for (const filePath of this.binaryFiles.keys()) {
            if (filePath.startsWith(prefix)) {
                this.binaryFiles.delete(filePath);
            }
        }
    }
    join(...paths) {
        return paths.join('/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    }
    dirname(path) {
        const lastSlash = path.lastIndexOf('/');
        return lastSlash <= 0 ? '/' : path.slice(0, lastSlash);
    }
    isAbsolute(path) {
        return path.startsWith('/');
    }
    relative(from, to) {
        // Simple implementation for testing
        if (to.startsWith(from)) {
            return to.slice(from.length + 1);
        }
        return to;
    }
    isDirectory(path) {
        // Check if we have a directory marker
        if (this.files.has(path + '/.dir')) {
            return true;
        }
        // Check if any files exist under this path
        const prefix = `${path}/`;
        for (const filePath of this.files.keys()) {
            if (filePath.startsWith(prefix)) {
                return true;
            }
        }
        for (const filePath of this.binaryFiles.keys()) {
            if (filePath.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }
    // Repository operations
    normalizeRepositoryPath(inputPath) {
        // For testing, just find the closest parent directory with .git
        let current = inputPath;
        while (current && current !== '/') {
            if (this.exists(this.join(current, '.git'))) {
                return current;
            }
            current = this.dirname(current);
        }
        // If no .git found, throw an error
        throw new Error(`Not a git repository: ${inputPath}`);
    }
    findProjectRoot(inputPath) {
        return this.normalizeRepositoryPath(inputPath);
    }
    getRepositoryName(repositoryPath) {
        const segments = repositoryPath.split('/').filter((s) => s);
        return segments[segments.length - 1] || 'root';
    }
    // Test utilities
    clear() {
        this.files.clear();
        this.binaryFiles.clear();
    }
    getFiles() {
        return new Map(this.files);
    }
    // Helper to set up a test repository structure
    setupTestRepo(repoPath) {
        this.createDir(repoPath);
        this.createDir(this.join(repoPath, '.git'));
        this.createDir(this.join(repoPath, '.alexandria'));
    }
    // Helper to debug what's in the filesystem
    debug() {
        console.log('InMemory FileSystem Contents:');
        for (const [path, content] of this.files.entries()) {
            if (!path.endsWith('/.dir')) {
                console.log(`  ${path}: ${content.length} bytes`);
            }
        }
    }
}
//# sourceMappingURL=InMemoryFileSystemAdapter.js.map