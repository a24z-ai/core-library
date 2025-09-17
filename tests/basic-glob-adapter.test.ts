import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BasicGlobAdapter } from '../src/node-adapters/BasicGlobAdapter';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('BasicGlobAdapter', () => {
  let testDir: string;
  let globAdapter: BasicGlobAdapter;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = path.join(tmpdir(), `basic-glob-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.hidden'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'node_modules', 'pkg'), { recursive: true });

    // Create test files
    fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
    fs.writeFileSync(path.join(testDir, 'docs', 'guide.md'), '# Guide');
    fs.writeFileSync(path.join(testDir, 'docs', 'api.mdx'), '# API');
    fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'export {}');
    fs.writeFileSync(path.join(testDir, '.hidden', 'secret.md'), '# Secret');
    fs.writeFileSync(path.join(testDir, 'node_modules', 'pkg', 'readme.md'), '# Package');
    fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules\n*.tmp');

    globAdapter = new BasicGlobAdapter();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should find markdown files with glob pattern', async () => {
    const files = await globAdapter.findFiles(['**/*.md'], {
      cwd: testDir,
      onlyFiles: true,
    });

    expect(files).toContain('README.md');
    expect(files).toContain('docs/guide.md');
    expect(files).not.toContain('docs/api.mdx');
    expect(files).not.toContain('src/index.ts');
    // Should not include node_modules by default
    expect(files).not.toContain('node_modules/pkg/readme.md');
  });

  it('should handle multiple extensions with brace expansion', async () => {
    const files = await globAdapter.findFiles(['**/*.{md,mdx}'], {
      cwd: testDir,
      onlyFiles: true,
    });

    expect(files).toContain('README.md');
    expect(files).toContain('docs/guide.md');
    expect(files).toContain('docs/api.mdx');
  });

  it('should respect dot option for hidden files', async () => {
    const withoutDot = await globAdapter.findFiles(['**/*.md'], {
      cwd: testDir,
      dot: false,
    });

    const withDot = await globAdapter.findFiles(['**/*.md'], {
      cwd: testDir,
      dot: true,
    });

    expect(withoutDot).not.toContain('.hidden/secret.md');
    expect(withDot).toContain('.hidden/secret.md');
  });

  it('should handle multiple patterns', async () => {
    const files = await globAdapter.findFiles(['**/*.md', '**/*.ts'], {
      cwd: testDir,
      onlyFiles: true,
    });

    expect(files).toContain('README.md');
    expect(files).toContain('src/index.ts');
  });

  it('should respect ignore patterns', async () => {
    const files = await globAdapter.findFiles(['**/*.md'], {
      cwd: testDir,
      ignore: ['**/guide.md'],
    });

    expect(files).toContain('README.md');
    expect(files).not.toContain('docs/guide.md');
  });

  it('should respect gitignore when enabled', async () => {
    // Create a temp file that should be ignored
    fs.writeFileSync(path.join(testDir, 'test.tmp'), 'temp');
    fs.writeFileSync(path.join(testDir, 'test.md'), '# Test');

    const withGitignore = await globAdapter.findFiles(['**/*'], {
      cwd: testDir,
      gitignore: true,
      onlyFiles: true,
    });

    const withoutGitignore = await globAdapter.findFiles(['**/*'], {
      cwd: testDir,
      gitignore: false,
      onlyFiles: true,
    });

    // With gitignore should not include .tmp files (per .gitignore)
    expect(withGitignore).not.toContain('test.tmp');
    expect(withGitignore).toContain('test.md');

    // Without gitignore should include everything
    expect(withoutGitignore).toContain('test.tmp');
    expect(withoutGitignore).toContain('test.md');
  });

  it('should work with sync method', () => {
    const files = globAdapter.findFilesSync(['**/*.md'], {
      cwd: testDir,
      onlyFiles: true,
    });

    expect(files).toContain('README.md');
    expect(files).toContain('docs/guide.md');
  });
});

describe('BasicGlobAdapter as default in rules engine', () => {
  it('should be used by default in LibraryRulesEngine', () => {
    const { LibraryRulesEngine } = require('../src/rules/engine');

    // Should be able to create engine without providing glob adapter
    const engine = new LibraryRulesEngine();
    expect(engine).toBeDefined();

    // The engine should use BasicGlobAdapter by default (not NodeGlobAdapter which requires globby)
    // This test would fail if NodeGlobAdapter was still the default
  });
});