import { describe, it, expect, beforeEach } from 'bun:test';
import { AlexandriaOutpostManager } from '../../src/projects-core/AlexandriaOutpostManager';
import { InMemoryFileSystemAdapter } from '../test-adapters/InMemoryFileSystemAdapter';
import { InMemoryGlobAdapter } from '../test-adapters/InMemoryGlobAdapter';
import type { CodebaseView } from '../../src/pure-core/types/index';

// Test helper class that allows mocking MemoryPalace
class TestableAlexandriaOutpostManager extends AlexandriaOutpostManager {
  private mockViews: CodebaseView[] = [];

  setMockViews(views: CodebaseView[]) {
    this.mockViews = views;
  }

  protected createMemoryPalace(): { listViews: () => CodebaseView[] } {
    // Return a mock MemoryPalace
    return {
      listViews: () => this.mockViews
    };
  }
}

describe('AlexandriaOutpostManager', () => {
  let manager: TestableAlexandriaOutpostManager;
  let fs: InMemoryFileSystemAdapter;
  let globAdapter: InMemoryGlobAdapter;
  const testRepoPath = '/test-repo';

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    globAdapter = new InMemoryGlobAdapter(fs);

    // Set up test repository structure
    fs.createDir(testRepoPath);
    fs.createDir(`${testRepoPath}/.git`);  // Required for MemoryPalace validation
    fs.createDir(`${testRepoPath}/.alexandria`);
    fs.createDir(`${testRepoPath}/.alexandria/views`);
    fs.createDir(`${testRepoPath}/docs`);
    fs.createDir(`${testRepoPath}/src`);

    // Create Alexandria files
    fs.writeFile(`${testRepoPath}/.alexandria/views.json`, '[]');
    fs.writeFile(`${testRepoPath}/.alexandria/anchored-notes.json`, '[]');

    // Create testable manager with test adapters
    manager = new TestableAlexandriaOutpostManager(fs, globAdapter);
  });

  describe('getAllDocs', () => {
    it('should find all markdown files in the repository', async () => {
      // Create test markdown files
      fs.writeFile(`${testRepoPath}/README.md`, '# README');
      fs.writeFile(`${testRepoPath}/docs/guide.md`, '# Guide');
      fs.writeFile(`${testRepoPath}/docs/api.md`, '# API');
      fs.writeFile(`${testRepoPath}/src/component.md`, '# Component');
      fs.writeFile(`${testRepoPath}/.alexandria/internal.md`, '# Internal');

      // Register the test repo
      await manager.registerRepository('test-repo', testRepoPath);

      // Get the entry
      const entries = manager.getAllEntries();
      const entry = entries.find(e => e.name === 'test-repo')!;

      // Get all docs
      const allDocs = await manager.getAllDocs(entry);

      expect(allDocs).toContain('README.md');
      expect(allDocs).toContain('docs/guide.md');
      expect(allDocs).toContain('docs/api.md');
      expect(allDocs).toContain('src/component.md');
      // Should NOT include .alexandria files (dot: false filters them)
      expect(allDocs).not.toContain('.alexandria/internal.md');
      expect(allDocs.length).toBe(4);
    });

    it('should respect useGitignore parameter', async () => {
      // Create test files
      fs.writeFile(`${testRepoPath}/README.md`, '# README');
      fs.writeFile(`${testRepoPath}/docs/guide.md`, '# Guide');

      // Track glob adapter calls
      const originalFindFiles = globAdapter.findFiles.bind(globAdapter);
      let findFilesCalls: { patterns: string[]; options?: unknown }[] = [];

      globAdapter.findFiles = async (patterns, options) => {
        findFilesCalls.push({ patterns, options });
        return originalFindFiles(patterns, options);
      };

      await manager.registerRepository('test-repo', testRepoPath);
      const entries = manager.getAllEntries();
      const entry = entries.find(e => e.name === 'test-repo')!;

      // Test with gitignore enabled (default)
      await manager.getAllDocs(entry);
      expect(findFilesCalls[0]?.options?.gitignore).toBe(true);

      // Reset calls
      findFilesCalls = [];

      // Test with gitignore disabled
      await manager.getAllDocs(entry, false);
      expect(findFilesCalls[0]?.options?.gitignore).toBe(false);
    });
  });

  describe('getAlexandriaEntryDocs', () => {
    it('should return overview paths from views', async () => {
      // Set up mock views
      manager.setMockViews([
        {
          id: 'test-view',
          overviewPath: 'docs/overview.md',
          cells: {}
        } as CodebaseView
      ]);

      await manager.registerRepository('test-repo', testRepoPath);
      const entries = manager.getAllEntries();
      const entry = entries.find(e => e.name === 'test-repo')!;

      // Get tracked docs
      const trackedDocs = await manager.getAlexandriaEntryDocs(entry);

      expect(trackedDocs).toContain('docs/overview.md');
      expect(trackedDocs.length).toBe(1);
    });
  });

  describe('getAlexandriaEntryExcludedDocs', () => {
    it('should return excluded files from config', async () => {
      // Create config with excluded files
      const config = {
        context: {
          rules: [
            {
              id: 'require-references',
              options: {
                excludeFiles: ['LICENSE.md', 'CHANGELOG.md']
              }
            }
          ]
        }
      };
      fs.writeFile(`${testRepoPath}/.alexandriarc.json`, JSON.stringify(config));

      // Register repo first to get proper entry structure
      await manager.registerRepository('test-repo', testRepoPath);
      const entries = manager.getAllEntries();
      const entry = entries.find(e => e.name === 'test-repo')!;

      const excludedDocs = manager.getAlexandriaEntryExcludedDocs(entry);

      expect(excludedDocs).toContain('LICENSE.md');
      expect(excludedDocs).toContain('CHANGELOG.md');
      expect(excludedDocs.length).toBe(2);
    });

    it('should return empty array if no config', async () => {
      // Register repo first to get proper entry structure
      await manager.registerRepository('test-repo', testRepoPath);
      const entries = manager.getAllEntries();
      const entry = entries.find(e => e.name === 'test-repo')!;

      const excludedDocs = manager.getAlexandriaEntryExcludedDocs(entry);

      expect(excludedDocs).toEqual([]);
    });
  });

  describe('getUntrackedDocs', () => {
    it('should return only untracked markdown files', async () => {
      // Create various markdown files
      fs.writeFile(`${testRepoPath}/README.md`, '# README');
      fs.writeFile(`${testRepoPath}/docs/tracked.md`, '# Tracked');
      fs.writeFile(`${testRepoPath}/docs/untracked.md`, '# Untracked');
      fs.writeFile(`${testRepoPath}/LICENSE.md`, '# License');
      fs.writeFile(`${testRepoPath}/.alexandria/internal.md`, '# Internal');

      // Set up mock view that tracks one doc
      manager.setMockViews([
        {
          id: 'test-view',
          overviewPath: 'docs/tracked.md',
          cells: {}
        } as CodebaseView
      ]);

      // Create config that excludes LICENSE.md
      const config = {
        context: {
          rules: [
            {
              id: 'require-references',
              options: {
                excludeFiles: ['LICENSE.md']
              }
            }
          ]
        }
      };
      fs.writeFile(`${testRepoPath}/.alexandriarc.json`, JSON.stringify(config));

      await manager.registerRepository('test-repo', testRepoPath);
      const entries = manager.getAllEntries();
      const entry = entries.find(e => e.name === 'test-repo')!;

      // Get untracked docs
      const untrackedDocs = await manager.getUntrackedDocs(entry);

      // Should include only truly untracked files
      expect(untrackedDocs).toContain('README.md');
      expect(untrackedDocs).toContain('docs/untracked.md');

      // Should NOT include tracked, excluded, or Alexandria's own files
      expect(untrackedDocs).not.toContain('docs/tracked.md');  // tracked
      expect(untrackedDocs).not.toContain('LICENSE.md');  // excluded
      expect(untrackedDocs).not.toContain('.alexandria/internal.md');  // Alexandria's own

      expect(untrackedDocs.length).toBe(2);
    });

    it('should handle repository with no markdown files', async () => {
      await manager.registerRepository('test-repo', testRepoPath);
      const entries = manager.getAllEntries();
      const entry = entries.find(e => e.name === 'test-repo')!;

      const untrackedDocs = await manager.getUntrackedDocs(entry);

      expect(untrackedDocs).toEqual([]);
    });

    it('should handle repository where all docs are tracked or excluded', async () => {
      // Create markdown files
      fs.writeFile(`${testRepoPath}/docs/tracked.md`, '# Tracked');
      fs.writeFile(`${testRepoPath}/LICENSE.md`, '# License');

      // Set up mock view to track one
      manager.setMockViews([
        {
          id: 'test-view',
          overviewPath: 'docs/tracked.md',
          cells: {}
        } as CodebaseView
      ]);

      // Exclude the other
      const config = {
        context: {
          rules: [
            {
              id: 'require-references',
              options: {
                excludeFiles: ['LICENSE.md']
              }
            }
          ]
        }
      };
      fs.writeFile(`${testRepoPath}/.alexandriarc.json`, JSON.stringify(config));

      await manager.registerRepository('test-repo', testRepoPath);
      const entries = manager.getAllEntries();
      const entry = entries.find(e => e.name === 'test-repo')!;

      const untrackedDocs = await manager.getUntrackedDocs(entry);

      expect(untrackedDocs).toEqual([]);
    });
  });
});