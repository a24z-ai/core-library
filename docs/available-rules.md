# Available Rules

This document provides complete documentation for all rules available in the Alexandria core library's rules engine.

## document-organization

### Purpose
Ensures documentation files are properly organized in designated folders rather than scattered throughout the codebase. This improves discoverability and maintainability by keeping documentation in predictable locations.

### How It Works
1. Scans for all markdown files (`.md` and `.mdx`) in the repository
2. Checks if documentation files are in approved locations
3. Reports violations when documentation is found outside approved locations

### Default Severity
`warning`

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `documentFolders` | `string[]` | `['docs', 'documentation', 'doc']` | Folder names where documentation should be stored |
| `rootExceptions` | `string[]` | `['README.md', 'LICENSE.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'AUTHORS.md', 'CONTRIBUTORS.md', 'ACKNOWLEDGMENTS.md', 'HISTORY.md', 'NOTICE.md', 'SUPPORT.md']` | Filenames allowed in the root directory |
| `checkNested` | `boolean` | `true` | Whether to check parent directories for doc folders |

### Approved Locations
- Designated documentation folders (as configured)
- Root directory (for files in `rootExceptions`)
- Special directories: `.github`, `templates`, `examples`
- Inside `node_modules` (ignored)

### Example Violations

```
src/components/Button.md
    ⚠ Documentation file "src/components/Button.md" should be in a documentation folder (e.g., docs/, documentation/)
      rule: document-organization
      impact: Disorganized documentation makes it harder for both humans and AI agents to find relevant information

lib/utils/helper-guide.md
    ⚠ Documentation file "lib/utils/helper-guide.md" should be in a documentation folder
      rule: document-organization
```

### How to Fix
1. Move documentation files to a designated documentation folder
2. Update any references to the moved files
3. Add files to `rootExceptions` if they should remain in root
4. Configure `documentFolders` to include your preferred folder names

### Configuration Example

```json
{
  "context": {
    "rules": [
      {
        "id": "document-organization",
        "severity": "error",
        "enabled": true,
        "options": {
          "documentFolders": ["docs", "documentation"],
          "rootExceptions": ["README.md", "LICENSE.md", "API.md"],
          "checkNested": false
        }
      }
    ]
  }
}
```

---

## filename-convention

### Purpose
Enforces consistent filename conventions for documentation files. Consistent naming makes files easier to locate, reference, and maintain, while also presenting a more professional appearance.

### How It Works
1. Scans documentation files in the repository
2. Validates filenames against specified naming conventions
3. Can optionally auto-fix violations by renaming files

### Default Severity
`warning`

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `style` | `'snake_case' \| 'kebab-case' \| 'camelCase' \| 'PascalCase' \| 'lowercase' \| 'UPPERCASE'` | `'kebab-case'` | Naming style to enforce |
| `separator` | `'_' \| '-' \| ' ' \| '.'` | Based on style | Custom separator character (overrides style) |
| `caseStyle` | `'lower' \| 'upper' \| 'mixed'` | Based on style | Additional case enforcement |
| `extensions` | `string[]` | `['.md', '.mdx']` | File extensions to check |
| `exclude` | `string[]` | `[]` | Glob patterns to exclude from checking |
| `exceptions` | `string[]` | `['README.md', 'LICENSE.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'CODE_OF_CONDUCT.md']` | Exact filenames to allow as exceptions |
| `documentFoldersOnly` | `boolean` | `false` | Only check files in documentation folders |
| `autoFix` | `boolean` | `false` | Enable auto-fix by renaming files |

### Naming Styles

| Style | Example | Description |
|-------|---------|-------------|
| `kebab-case` | `api-reference.md` | Lowercase with hyphens (recommended) |
| `snake_case` | `api_reference.md` | Lowercase with underscores |
| `camelCase` | `apiReference.md` | First word lowercase, subsequent words capitalized |
| `PascalCase` | `ApiReference.md` | All words capitalized |
| `lowercase` | `apireference.md` | All lowercase, no separators |
| `UPPERCASE` | `APIREFERENCE.md` | All uppercase, no separators |

### Example Violations

```
docs/API_Reference.md
    ⚠ File "API_Reference.md" should be named "api-reference.md" to match kebab-case convention
      rule: filename-convention
      impact: Inconsistent filename conventions make it harder to locate and reference documentation

docs/userGuide.md
    ⚠ File "userGuide.md" should be named "user-guide.md" to match kebab-case convention
      rule: filename-convention
```

### How to Fix
1. Rename files to match the specified convention
2. Add files to the `exceptions` list if they should keep their current names
3. Enable `autoFix: true` for automatic renaming (use with caution)
4. Adjust the `style` configuration to match your team's preferences

### Configuration Examples

Strict kebab-case for all markdown:
```json
{
  "id": "filename-convention",
  "severity": "error",
  "options": {
    "style": "kebab-case",
    "exceptions": ["README.md", "CHANGELOG.md"],
    "autoFix": false
  }
}
```

Snake case for documentation folders only:
```json
{
  "id": "filename-convention",
  "severity": "warning",
  "options": {
    "style": "snake_case",
    "documentFoldersOnly": true,
    "extensions": [".md", ".mdx", ".rst"]
  }
}
```

---

## require-references

### Purpose
Ensures that markdown documentation files have associated CodebaseViews in Alexandria. This creates explicit connections between documentation and code, enabling AI agents to understand the context and relationships.

### How It Works
1. Scans for all markdown files in the repository
2. Checks for corresponding CodebaseView files in `.alexandria/views/`
3. Validates that views properly reference the documentation
4. Reports documentation files lacking CodebaseView associations

### Default Severity
`error`

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `excludeFiles` | `string[]` | `[]` | List of files to exclude from the requirement |

### What Makes a Valid Reference
A markdown file is considered properly referenced when:
- A CodebaseView exists with the markdown file as its `overviewPath`
- The view file is valid JSON
- The view contains proper structure with cells and file references

### Example Violations

```
docs/authentication.md
    ✖ Markdown file "docs/authentication.md" is not associated with any CodebaseView
      rule: require-references
      impact: AI agents lack structured context for understanding this documentation

docs/api/users.md
    ✖ Markdown file "docs/api/users.md" is not associated with any CodebaseView
      rule: require-references
      impact: AI agents lack structured context for understanding this documentation
```

### How to Fix
1. Run `alexandria add-doc docs/authentication.md` to create a CodebaseView
2. Manually create a view file in `.alexandria/views/`
3. Add the file to `excludeFiles` if it doesn't need a view
4. Ensure the view's `overviewPath` points to the documentation file

### Configuration Example

```json
{
  "context": {
    "rules": [
      {
        "id": "require-references",
        "severity": "error",
        "enabled": true,
        "options": {
          "excludeFiles": [
            "CHANGELOG.md",
            "README.md",
            "docs/archive/**/*.md"
          ]
        }
      }
    ]
  }
}
```

### Impact
Without CodebaseView associations:
- AI agents cannot understand which code files relate to documentation
- Documentation becomes disconnected from implementation
- File references cannot be validated
- Context is lost when navigating between docs and code

---

## stale-references

### Purpose
Detects outdated or broken file references in CodebaseViews. This ensures that documentation remains accurate and that all file references point to existing code.

### How It Works
1. Loads all CodebaseView files from `.alexandria/views/`
2. Checks each referenced file path for existence
3. Optionally checks the age of references
4. Reports missing files and stale references

### Default Severity
`warning`

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAgeDays` | `number` | `90` | Maximum age in days before a reference is considered stale |

### Types of Issues Detected

1. **Missing Files**: Referenced files that no longer exist
2. **Stale References**: References older than the configured threshold
3. **Invalid Paths**: Malformed or inaccessible file paths

### Example Violations

```
View "authentication-system" (authentication-system.json)
    ⚠ Referenced file does not exist: src/auth/old-handler.ts
      rule: stale-references
      impact: Broken references lead to confusion and errors when navigating documentation

View "user-api" (user-api.json)
    ⚠ Reference is stale (last updated 120 days ago): src/legacy/users.ts
      rule: stale-references
      impact: Outdated references may not reflect current implementation
```

### How to Fix
1. Remove references to deleted files from CodebaseViews
2. Update file paths if files were moved/renamed
3. Review and update stale references
4. Regenerate views with `alexandria add-doc` if structure changed significantly
5. Increase `maxAgeDays` if your codebase has stable, long-lived files

### Configuration Example

```json
{
  "context": {
    "rules": [
      {
        "id": "stale-references",
        "severity": "error",
        "enabled": true,
        "options": {
          "maxAgeDays": 30
        }
      }
    ]
  }
}
```

### Best Practices
- Run this rule regularly in CI/CD to catch broken references early
- Set `maxAgeDays` based on your team's refactoring frequency
- Use version control to track when references were last validated
- Consider setting severity to `error` for production branches

---

## Rule Priority and Execution

### Execution Order
Rules are executed in the following order:
1. `document-organization` - Structural organization
2. `filename-convention` - Naming standards
3. `require-references` - Documentation completeness
4. `stale-references` - Reference validity

### Severity Levels

| Level | Description | Behavior |
|-------|-------------|----------|
| `error` | Critical issues that must be fixed | Blocks operations, exits with error code |
| `warning` | Important issues that should be addressed | Logged, may block based on configuration |
| `info` | Suggestions for improvement | Logged only, never blocks |

### Disabling Rules

To completely disable a rule:

```json
{
  "context": {
    "rules": [
      {
        "id": "filename-convention",
        "enabled": false
      }
    ]
  }
}
```

### Running Specific Rules

When using the API, you can run specific rules:

```typescript
const rulesEngine = new LibraryRulesEngine(fsAdapter, repoPath);

// Run only document-organization
const results = await rulesEngine.runRule('document-organization');

// Run multiple specific rules
const rules = ['require-references', 'stale-references'];
for (const ruleId of rules) {
  const result = await rulesEngine.runRule(ruleId);
  console.log(`${ruleId}: ${result.violations.length} issues`);
}
```

## Implementation Details

All rules are implemented in the core library:

- **Engine**: [src/rules/engine.ts](src/rules/engine.ts)
- **Base Classes**: [src/rules/types.ts](src/rules/types.ts)
- **Implementations**: [src/rules/implementations/](src/rules/implementations/)

Each rule extends the base `Rule` interface and implements:
- `run()` - Main validation logic
- `getDefaultSeverity()` - Default severity level
- `getDescription()` - Human-readable description