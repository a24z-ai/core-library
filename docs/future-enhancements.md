# Future Enhancements

This document captures ideas for improving the Alexandria core library and documentation system.

## Documentation Organization

### Folder-Based Categories

Currently, CodebaseViews use a `category` field that must be manually set. We could automatically derive categories from folder structure to reduce maintenance overhead:

```
docs/
├── architecture/     → category: "architecture" 
├── guides/          → category: "guides"
├── api/             → category: "api"
├── tutorials/       → category: "tutorials"
└── reference/       → category: "reference"
```

**Benefits:**
- Automatic category assignment based on file location
- Easier to maintain and organize documentation
- Natural grouping that matches filesystem structure
- Reduces manual configuration in CodebaseViews

**Implementation Ideas:**
- New Alexandria rule: `folder-category-mapping`
- Configuration in `.alexandriarc.json`:
  ```json
  {
    "rules": {
      "folder-category-mapping": {
        "enabled": true,
        "mappings": {
          "docs/architecture/": "architecture",
          "docs/guides/": "guides",
          "docs/api/": "api-reference"
        },
        "defaultCategory": "other"
      }
    }
  }
  ```

### Enhanced Rule System

**New Rule: `folder-category-consistency`**
- Validates that CodebaseView categories match their folder location
- Auto-fixes by updating category to match folder structure
- Warns when documents are in unexpected locations

**New Rule: `minimum-references`**
- Ensures CodebaseViews have a minimum number of file references
- Configurable threshold (e.g., at least 3 files per view)
- Prevents "orphaned" documentation that doesn't connect to code
- Configuration example:
  ```json
  {
    "minimum-references": {
      "enabled": true,
      "minFiles": 3,
      "exceptions": ["planning", "meta"]
    }
  }
  ```

**New Rule: `minimum-coverage`**
- Validates that important directories have associated documentation
- Ensures core source directories are covered by CodebaseViews
- Configurable coverage requirements per directory type
- Configuration example:
  ```json
  {
    "minimum-coverage": {
      "enabled": true,
      "requiredDirectories": [
        "src/core/",
        "src/api/", 
        "src/utils/"
      ],
      "coverageThreshold": 80
    }
  }
  ```

## Path Management Enhancements

### Multi-Repository Path Caching
- Cache validated paths across repository sessions
- Reduce filesystem calls for frequently accessed repositories
- Implement cache invalidation on directory structure changes

### Remote Repository Support
- Extend path validation for remote repositories
- Support for GitHub/GitLab repository references
- Enable cross-repository CodebaseViews

## Developer Experience

### Interactive Documentation Setup
- CLI wizard for initial documentation organization
- Suggested folder structure based on project type
- Automated CodebaseView generation from existing docs

### Documentation Health Metrics
- Track documentation coverage per code directory
- Identify code areas lacking documentation
- Generate reports on documentation freshness

## Quality Assurance

### Enhanced Validation Rules
- `code-documentation-ratio`: Ensure adequate docs per code volume
- `stale-reference-detection`: Flag outdated code references
- `documentation-completeness`: Check for missing essential docs

### Integration Improvements
- IDE extensions for real-time CodebaseView validation
- GitHub bot for automatic documentation PR reviews
- Slack/Discord notifications for documentation quality issues

## Implementation Priority

1. **High Priority**: Folder-based categories (immediate developer productivity)
2. **Medium Priority**: Enhanced rule system and validation
3. **Low Priority**: Remote repository support and advanced metrics

## Contributing

When implementing these enhancements:
- Maintain backward compatibility with existing CodebaseViews
- Add comprehensive tests for new rules and features
- Update documentation and examples
- Consider performance impact on large repositories

---
*Last reviewed: 2025-09-24 - Document confirmed to be up-to-date with current implementation.*