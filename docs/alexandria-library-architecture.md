# Alexandria React Library Architecture

## Overview

This document outlines the strategy for extracting Alexandria's UI components into a reusable React library that can be shared between the web application and an Electron desktop application. The library will maintain consistent theming through the `themed-markdown` package.

## Goals

1. **Portability**: Create a React component library that works seamlessly in both web and Electron environments
2. **Consistency**: Maintain unified theming across all components using `themed-markdown`
3. **Documentation**: Use Storybook to catalog and document all components
4. **Maintainability**: Keep a single source of truth for UI components

## Prerequisites: Core Library Migration

### Move Bookmark/Storage Logic to @a24z/core-library

Before creating the UI library, the bookmark and reading record functionality needs to be extracted to the `@a24z/core-library` package. This separation ensures:

1. **Business logic independence**: Core functionality isn't tied to UI implementation
2. **Reusability**: Other applications can use the bookmark system without the UI
3. **Clean architecture**: Clear separation between data/logic and presentation layers

**Items to move to @a24z/core-library:**
```
- storage/types.ts                 → Core type definitions
- storage/ReadingRecordManager.ts  → Storage management logic
- storage/adapters/                → Storage adapter implementations
  - memory.ts
  - localStorage.ts
- types/alexandria-state.ts        → State type definitions
- types/alexandria-bookmarks.ts    → Bookmark type definitions
```

The UI library will then import these from `@a24z/core-library`:
```typescript
import {
  ReadingRecordManager,
  MemoryReadingRecordAdapter,
  type AlexandriaBookmark,
  type AlexandriaVisit
} from '@a24z/core-library';
```

## Migration Process

### Step 1: Repository Duplication
1. Copy the entire Alexandria repository to create `@alexandria/ui-library`
2. This ensures we maintain all configurations, dependencies, and component relationships

### Step 2: Cleanup - Remove Non-Library Code
Remove the following directories and files:
```
- /server/           # Backend server code
- /public/           # Static assets specific to web app
- /dist/             # Build outputs
- astro.config.mjs   # Astro-specific configuration
- tsconfig.server.json
- package-outpost.json
- README-outpost.md
```

### Step 3: Library Structure
Transform the codebase into this structure:
```
@alexandria/ui-library/
├── src/
│   ├── components/          # All React components
│   │   ├── Alexandria.tsx
│   │   ├── RepositoryViewer.tsx
│   │   ├── RepositoryCard.tsx
│   │   ├── BookmarkedDocuments.tsx
│   │   ├── ViewDisplay.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── EmptyState.tsx
│   │   ├── AnimatedBookIcon.tsx
│   │   ├── FontScaleControls.tsx
│   │   ├── ProductShowcase.tsx
│   │   └── ui/              # Base UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       ├── tabs.tsx
│   │       ├── dialog.tsx
│   │       ├── command.tsx
│   │       └── scroll-area.tsx
│   ├── hooks/               # Custom React hooks
│   │   └── useReadingRecords.ts  # Will use @a24z/core-library
│   ├── lib/                 # Utilities and API clients
│   │   ├── alexandria-api.ts
│   │   ├── alexandria-theme.ts
│   │   └── utils.ts
│   └── index.ts             # Main library exports
├── .storybook/              # Storybook configuration
├── stories/                 # Component stories
├── package.json
└── tsconfig.json
```

Note: Storage functionality will be imported from `@a24z/core-library` rather than included directly.

### Step 4: Add Storybook

1. Install Storybook:
```bash
npx storybook@latest init --type react
```

2. Create stories for each component to document:
   - Props and their types
   - Different component states
   - Theme variations
   - Usage examples

3. Configure Storybook to use `themed-markdown` theming

### Step 5: Theming with themed-markdown

All components will use the `themed-markdown` package for consistent styling:

```typescript
// lib/theme-provider.tsx
import { ThemeProvider as ThemedMarkdownProvider } from 'themed-markdown';

export function AlexandriaThemeProvider({ children, theme }) {
  return (
    <ThemedMarkdownProvider theme={theme}>
      {children}
    </ThemedMarkdownProvider>
  );
}
```

Components should:
1. Import theme tokens from `themed-markdown`
2. Use theme-aware styling utilities
3. Support theme switching through context
4. Maintain consistency with markdown content styling

Example component using themed-markdown:
```typescript
// components/ui/button.tsx
import { useTheme } from 'themed-markdown';

export function Button({ variant, ...props }) {
  const theme = useTheme();

  // Apply theme tokens for consistent styling
  const styles = {
    backgroundColor: theme.colors.primary,
    color: theme.colors.background,
    // ... other theme-based styles
  };

  return <button style={styles} {...props} />;
}
```

## Package Configuration

### package.json
```json
{
  "name": "@alexandria/ui-library",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles": "./dist/styles.css"
  },
  "scripts": {
    "build": "rollup -c",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test": "jest",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0",
    "themed-markdown": "^0.1.23",
    "@a24z/core-library": "^0.2.0"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-tabs": "^1.1.13",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "lucide-react": "^0.542.0",
    "react-markdown": "^10.1.0",
    "tailwind-merge": "^3.3.1"
  }
}
```

## Library Exports

### Main exports (index.ts)
```typescript
// Complete Alexandria application
export { Alexandria } from './components/Alexandria';
export { AlexandriaThemeProvider } from './lib/theme-provider';

// Individual components for custom integrations
export { RepositoryViewer } from './components/RepositoryViewer';
export { RepositoryCard } from './components/RepositoryCard';
export { BookmarkedDocuments } from './components/BookmarkedDocuments';
export { ViewDisplay } from './components/ViewDisplay';

// UI primitives
export * from './components/ui';

// Hooks (using @a24z/core-library for data management)
export { useReadingRecords } from './hooks/useReadingRecords';

// Re-export core types from @a24z/core-library for convenience
export type {
  AlexandriaVisit,
  AlexandriaBookmark,
  AlexandriaLibraryCard,
  ReadingRecordAdapter,
  StorageCapabilities
} from '@a24z/core-library';
```

## Usage in Different Environments

### Web Application
```typescript
import { Alexandria, AlexandriaThemeProvider } from '@alexandria/ui-library';
import {
  ReadingRecordManager,
  LocalStorageReadingRecordAdapter
} from '@a24z/core-library';

function App() {
  const storageManager = new ReadingRecordManager({
    adapter: new LocalStorageReadingRecordAdapter()
  });

  return (
    <AlexandriaThemeProvider theme="github-dark">
      <Alexandria
        storageManager={storageManager}
        apiUrl="https://api.alexandria.com"
      />
    </AlexandriaThemeProvider>
  );
}
```

### Electron Application
```typescript
import { Alexandria, AlexandriaThemeProvider } from '@alexandria/ui-library';
import {
  ReadingRecordManager,
  ElectronStorageAdapter
} from '@a24z/core-library';

function ElectronApp() {
  const storageManager = new ReadingRecordManager({
    adapter: new ElectronStorageAdapter()
  });

  return (
    <AlexandriaThemeProvider theme="github-dark">
      <Alexandria
        storageManager={storageManager}
        apiUrl="http://localhost:8741"  // Local server
      />
    </AlexandriaThemeProvider>
  );
}
```

## Storybook Structure

Each component will have comprehensive stories:

```typescript
// stories/RepositoryCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { RepositoryCard } from '../src/components/RepositoryCard';
import { AlexandriaThemeProvider } from '../src/lib/theme-provider';

const meta: Meta<typeof RepositoryCard> = {
  title: 'Components/RepositoryCard',
  component: RepositoryCard,
  decorators: [
    (Story) => (
      <AlexandriaThemeProvider theme="github-dark">
        <Story />
      </AlexandriaThemeProvider>
    ),
  ],
};

export default meta;

export const Default: StoryObj = {
  args: {
    repository: {
      name: 'example-repo',
      description: 'An example repository',
      // ... other props
    },
  },
};

export const WithCustomTheme: StoryObj = {
  decorators: [
    (Story) => (
      <AlexandriaThemeProvider theme="monokai">
        <Story />
      </AlexandriaThemeProvider>
    ),
  ],
  args: {
    // ... props
  },
};
```

## Development Workflow

1. **Core Library Updates**: First update `@a24z/core-library` with bookmark/storage logic
2. **Component Development**: Create/modify components in the UI library
3. **Storybook Testing**: Verify components in isolation with different themes
4. **Build Library**: Generate distribution bundles
5. **Integration Testing**: Test in both web and Electron environments
6. **Publishing**: Publish to npm or private registry

## Benefits

1. **Single Source of Truth**: One codebase for all UI components
2. **Theme Consistency**: All components use themed-markdown for unified styling
3. **Documentation**: Storybook provides live documentation and testing
4. **Type Safety**: Full TypeScript support with exported types
5. **Platform Flexibility**: Core library adapter pattern allows platform-specific implementations
6. **Maintainability**: Changes propagate to all consuming applications
7. **Separation of Concerns**: Business logic in core-library, UI in ui-library

## Next Steps

1. Move bookmark/storage functionality to `@a24z/core-library`
2. Set up the new UI library repository structure
3. Configure build tools (Rollup/Vite for library bundling)
4. Implement Storybook with themed-markdown integration
5. Create comprehensive component stories
6. Set up CI/CD for automated testing and publishing
7. Document migration guide for existing applications