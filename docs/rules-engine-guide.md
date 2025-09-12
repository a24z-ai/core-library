# Rules Engine Guide

## Overview

The Alexandria core library includes a `LibraryRulesEngine` that validates documentation organization, file references, and naming conventions. It helps maintain consistent, well-structured documentation that both humans and AI can navigate effectively.

## Basic Usage

```typescript
import { LibraryRulesEngine, NodeFileSystemAdapter } from '@a24z/core-library';

// Initialize the rules engine
const fsAdapter = new NodeFileSystemAdapter();
const rulesEngine = new LibraryRulesEngine(fsAdapter, '/path/to/repo');

// Run all enabled rules
const results = await rulesEngine.runRules();

// Run a specific rule
const docOrgResults = await rulesEngine.runRule('document-organization');

// Check results
results.forEach(result => {
  if (!result.valid) {
    console.log(`${result.ruleId}: ${result.violations.length} issues found`);
  }
});
```

## How It Works

The rules engine:
1. Reads configuration from `.alexandriarc.json` (if present)
2. Scans the repository based on rule requirements
3. Validates against rule criteria
4. Returns detailed violation information
5. Suggests fixes where applicable

## Configuration

Rules are configured in `.alexandriarc.json`:

```json
{
  "context": {
    "rules": [
      {
        "id": "document-organization",
        "severity": "error",
        "enabled": true,
        "options": {
          "documentFolders": ["docs"],
          "rootExceptions": ["README.md", "LICENSE"]
        }
      }
    ]
  }
}
```

## Severity Levels

- **error** - Critical issues that must be fixed
- **warning** - Important issues that should be addressed
- **info** - Suggestions for improvement

## Available Rules

The library includes several built-in rules:

- **document-organization** - Ensures docs are in proper folders
- **filename-convention** - Enforces consistent file naming
- **require-references** - Ensures docs have CodebaseView associations
- **stale-references** - Detects outdated file references

See [Available Rules](available-rules.md) for detailed documentation of each rule.

## Integration

### With MemoryPalace

```typescript
const palace = new MemoryPalace(fsAdapter, repoPath);
const rulesEngine = new LibraryRulesEngine(fsAdapter, repoPath);

// Validate before saving views
const results = await rulesEngine.runRule('require-references');
if (results.some(r => !r.valid)) {
  console.warn('Documentation missing CodebaseView references');
}
```

### In CI/CD

```typescript
// Fail build on rule violations
const results = await rulesEngine.runRules();
const hasErrors = results.some(r => 
  r.violations.some(v => v.severity === 'error')
);

if (hasErrors) {
  process.exit(1);
}
```

## Implementation

- **Source**: [src/rules/](src/rules/)
- **Engine**: [src/rules/engine.ts](src/rules/engine.ts)
- **Rule Implementations**: [src/rules/implementations/](src/rules/implementations/)

## Related Documentation

- [Available Rules](available-rules.md) - Detailed rule documentation
- [Configuration](adapter-architecture.md) - Configuration options