/**
 * Example demonstrating the GlobAdapter abstraction
 *
 * This shows how the globby dependency is now abstracted behind
 * the GlobAdapter interface, allowing for different implementations
 * and making it easier to test.
 */

import { LibraryRulesEngine } from '../src/rules/engine';
import { NodeGlobAdapter } from '../src/node-adapters/NodeGlobAdapter';
import { InMemoryGlobAdapter } from '../tests/test-adapters/InMemoryGlobAdapter';
import { InMemoryFileSystemAdapter } from '../tests/test-adapters/InMemoryFileSystemAdapter';

async function demonstrateGlobAdapterUsage() {
  console.log('=== GlobAdapter Abstraction Demo ===\n');

  // 1. Default usage with NodeGlobAdapter (uses globby)
  console.log('1. Using default NodeGlobAdapter (globby):');
  const defaultEngine = new LibraryRulesEngine();
  console.log('   ✓ Rules engine created with default globby-based adapter\n');

  // 2. Custom implementation for testing
  console.log('2. Using InMemoryGlobAdapter for testing:');
  const fs = new InMemoryFileSystemAdapter();
  const testGlobAdapter = new InMemoryGlobAdapter(fs);
  const testEngine = new LibraryRulesEngine(testGlobAdapter);
  console.log('   ✓ Rules engine created with in-memory adapter (no globby dependency)\n');

  // 3. Direct usage of GlobAdapter
  console.log('3. Direct usage of GlobAdapter:');
  const nodeGlob = new NodeGlobAdapter();
  const files = await nodeGlob.findFiles(['**/*.ts'], {
    cwd: process.cwd(),
    ignore: ['node_modules/**', 'dist/**'],
    onlyFiles: true,
  });
  console.log(`   Found ${files.length} TypeScript files\n`);

  // 4. Benefits of the abstraction
  console.log('Benefits of this abstraction:');
  console.log('   • Globby is now an implementation detail');
  console.log('   • Easy to swap implementations (e.g., fast-glob, minimatch)');
  console.log('   • Testable without external dependencies');
  console.log('   • Can provide fallback implementations');
  console.log('   • Follows the existing FileSystemAdapter pattern');
}

// Run the demo
demonstrateGlobAdapterUsage().catch(console.error);