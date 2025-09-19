import { ProjectRegistryStore } from './ProjectRegistryStore.js';
import { MemoryPalace } from '../MemoryPalace.js';
import type { AlexandriaRepository, AlexandriaEntry } from '../pure-core/types/repository.js';
import type { CodebaseViewSummary } from '../pure-core/types/summary.js';
import { extractCodebaseViewSummary } from '../pure-core/types/summary.js';
import type { ValidatedRepositoryPath } from '../pure-core/types/index.js';
import { homedir } from 'os';
import { ConfigLoader } from '../config/loader.js';

import { FileSystemAdapter } from '../pure-core/abstractions/filesystem.js';
import { GlobAdapter } from '../pure-core/abstractions/glob.js';

export class AlexandriaOutpostManager {
  private readonly projectRegistry: ProjectRegistryStore;

  constructor(
    private readonly fsAdapter: FileSystemAdapter,
    private readonly globAdapter: GlobAdapter
  ) {
    // Create the ProjectRegistryStore internally with the user's home directory
    this.projectRegistry = new ProjectRegistryStore(fsAdapter, homedir());
  }

  async getAllRepositories(): Promise<AlexandriaRepository[]> {
    // Get all registered projects from existing registry
    const entries = this.projectRegistry.listProjects();
    
    // Transform each to API format
    const repositories = await Promise.all(
      entries.map(entry => this.transformToRepository(entry))
    );
    
    return repositories.filter(repo => repo !== null) as AlexandriaRepository[];
  }

  async getRepository(name: string): Promise<AlexandriaRepository | null> {
    const entry = this.projectRegistry.getProject(name);
    if (!entry) return null;
    
    return this.transformToRepository(entry);
  }

  async registerRepository(name: string, path: string, remoteUrl?: string): Promise<AlexandriaRepository> {
    // Use existing registry's register method
    this.projectRegistry.registerProject(name, path as ValidatedRepositoryPath, remoteUrl);

    // Return the transformed repository
    const entry = this.projectRegistry.getProject(name);
    if (!entry) {
      throw new Error(`Failed to register repository ${name}`);
    }
    return this.transformToRepository(entry);
  }

  async getRepositoryByPath(path: string): Promise<AlexandriaRepository | null> {
    // Find repository by path
    const entries = this.projectRegistry.listProjects();
    const entry = entries.find(e => e.path === path);
    
    if (!entry) return null;
    return this.transformToRepository(entry);
  }

  getRepositoryCount(): number {
    return this.projectRegistry.listProjects().length;
  }

  getAllEntries(): AlexandriaEntry[] {
    return this.projectRegistry.listProjects();
  }

  /**
   * Get all overview file paths for views in a given repository entry
   * @param entry - The AlexandriaEntry for the local repository
   * @returns Array of overview file paths relative to repository root
   */
  async getAlexandriaEntryDocs(entry: AlexandriaEntry): Promise<string[]> {
    try {
      // Use protected method to create MemoryPalace (allows mocking in tests)
      const memoryPalace = this.createMemoryPalace(entry.path);

      // Get all views and extract their overview paths
      const views = memoryPalace.listViews();
      return views.map(v => v.overviewPath).filter(path => path && path.length > 0);
    } catch (error) {
      console.debug(`Could not load views for ${entry.name}:`, error);
      return [];
    }
  }

  /**
   * Protected method to create a MemoryPalace instance
   * Can be overridden in tests for mocking
   */
  protected createMemoryPalace(path: ValidatedRepositoryPath): MemoryPalace {
    return new MemoryPalace(path, this.fsAdapter);
  }

  /**
   * Get excluded document files from Alexandria require-references rule configuration
   * These are markdown files that are excluded from the requirement to be associated with CodebaseViews
   * @param entry - The AlexandriaEntry for the local repository
   * @returns Array of file paths excluded from tracking, or empty array if no config
   */
  getAlexandriaEntryExcludedDocs(entry: AlexandriaEntry): string[] {
    try {
      // Create a ConfigLoader to load the Alexandria configuration
      const configLoader = new ConfigLoader(this.fsAdapter);

      // Find and load config from the repository directory
      const configPath = configLoader.findConfigFile(entry.path);
      const config = configPath ? configLoader.loadConfig(configPath) : null;

      // Find the require-references rule configuration
      const requireReferencesRule = config?.context?.rules?.find(rule => rule.id === 'require-references');

      // Return the excludeFiles list if it exists
      const excludeFiles = (requireReferencesRule?.options as Record<string, unknown>)?.excludeFiles;
      return Array.isArray(excludeFiles) ? excludeFiles : [];
    } catch (error) {
      console.debug(`Could not load Alexandria config for ${entry.name}:`, error);
      return [];
    }
  }

  /**
   * Get all markdown documentation files in a repository
   * @param entry - The AlexandriaEntry for the local repository
   * @param useGitignore - Whether to respect .gitignore files (default: true)
   * @returns Array of all markdown file paths relative to repository root
   */
  async getAllDocs(entry: AlexandriaEntry, useGitignore: boolean = true): Promise<string[]> {
    try {
      // Find all markdown files in the repository
      const markdownFiles = await this.globAdapter.findFiles(['**/*.md', '**/*.mdx'], {
        cwd: entry.path,
        gitignore: useGitignore,
        dot: false,
        onlyFiles: true,
      });

      return markdownFiles;
    } catch (error) {
      console.debug(`Could not scan markdown files for ${entry.name}:`, error);
      return [];
    }
  }

  /**
   * Get untracked markdown documentation files in a repository
   * These are markdown files that are not used as overviews in any CodebaseView
   * and are not in the excluded files list
   * @param entry - The AlexandriaEntry for the local repository
   * @param useGitignore - Whether to respect .gitignore files (default: true)
   * @returns Array of untracked markdown file paths relative to repository root
   */
  async getUntrackedDocs(entry: AlexandriaEntry, useGitignore: boolean = true): Promise<string[]> {
    // Get all markdown files
    const allDocs = await this.getAllDocs(entry, useGitignore);

    // Get tracked docs (used as view overviews)
    const trackedDocs = await this.getAlexandriaEntryDocs(entry);

    // Get excluded docs from config
    const excludedDocs = this.getAlexandriaEntryExcludedDocs(entry);

    // Create sets for efficient lookup
    const trackedSet = new Set(trackedDocs);
    const excludedSet = new Set(excludedDocs);

    // Filter out tracked and excluded docs, and Alexandria's own files
    return allDocs.filter(doc => {
      // Skip if tracked
      if (trackedSet.has(doc)) return false;

      // Skip if excluded
      if (excludedSet.has(doc)) return false;

      // Skip Alexandria's own files
      if (doc.startsWith('.alexandria/')) return false;

      return true;
    });
  }

  private async transformToRepository(entry: AlexandriaEntry): Promise<AlexandriaRepository> {
    // Load views if not already loaded
    let views: CodebaseViewSummary[] = entry.views || [];
    
    if (views.length === 0) {
      try {
        // Use protected method to create MemoryPalace
        const memoryPalace = this.createMemoryPalace(entry.path);

        // Get views from the memory palace
        views = memoryPalace.listViews().map(v => extractCodebaseViewSummary(v));
      } catch (error) {
        // If we can't load views, continue with empty array
        console.debug(`Could not load views for ${entry.name}:`, error);
        views = [];
      }
    }
    
    // Extract owner from remote URL if available
    const owner = this.extractOwner(entry.remoteUrl);
    
    // Build the repository data according to AlexandriaRepository type
    const repo: AlexandriaRepository = {
      name: entry.name,
      remoteUrl: entry.remoteUrl,
      registeredAt: entry.registeredAt,
      hasViews: views.length > 0,
      viewCount: views.length,
      views,
      // Only include github if we have github data or can construct it
      github: entry.github || (owner ? {
        id: `${owner}/${entry.name}`,
        owner: owner,
        name: entry.name,
        stars: 0,
        lastUpdated: new Date().toISOString()
      } : undefined)
    };
    
    return repo;
  }

  private extractOwner(remoteUrl?: string): string | null {
    if (!remoteUrl) return null;
    // Extract owner from git URL
    const match = remoteUrl.match(/github\.com[:/]([^/]+)/);
    return match ? match[1] : null;
  }
}