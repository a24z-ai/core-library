# Alexandria Lint - Stale References Rule Bug Report

## Issue Summary
The `stale-references` rule incorrectly flags documentation as "stale" when files are formatted by Prettier, due to microsecond-level timestamp differences.

## Problem Details

### What's Happening
When running `npm run format` (Prettier), files are formatted sequentially with tiny time differences:

```
docs/memory-palace-guide.md: 2025-09-25T22:09:55.707Z
src/pure-core/types/index.ts: 2025-09-25T22:09:55.958Z
```

The code file ends up with a timestamp 251 milliseconds newer than the documentation file, causing the `stale-references` rule to report:

```
✖ Overview "docs/memory-palace-guide.md" was modified just after "src/pure-core/types/index.ts" changed
```

### Why This Is a Bug

1. **False positives**: The files were actually modified in the same formatting run, not because the code changed and docs became outdated
2. **The rule even says "just after"**: The rule recognizes these are very close timestamps (within minutes), but still flags them
3. **Breaks CI/CD**: This causes `alexandria lint` to fail even when no actual documentation staleness exists

## Reproduction Steps

1. Run `npm run format` on a codebase with Alexandria views
2. Run `alexandria lint`
3. Observe false "stale-references" violations for docs that reference formatted code files

## Suggested Fix

The `stale-references` rule should have a threshold (e.g., ignore differences less than 1-5 seconds) to account for:
- Sequential file processing by formatters
- Filesystem timestamp granularity differences
- Build tool processing delays

## Current Workaround

Use `--no-verify` when committing, or manually `touch` the documentation files after formatting.

## Impact

This affects all Alexandria library users who use automated formatting tools, causing unnecessary friction in the development workflow.