/**
 * Pure ProjectRegistryStore - Platform-agnostic project registry management
 *
 * Manages a registry of local project paths with their git remotes
 */

import { FileSystemAdapter } from '../pure-core/abstractions/filesystem';
import { ValidatedRepositoryPath } from '../pure-core/types';
import { AlexandriaEntry } from '../pure-core/types/repository';
import { ProjectRegistryData } from './types';

export class ProjectRegistryStore {
  private fs: FileSystemAdapter;
  private registryPath: string;

  constructor(fileSystemAdapter: FileSystemAdapter, homeDir: string) {
    this.fs = fileSystemAdapter;
    this.registryPath = this.fs.join(homeDir, '.alexandria', 'projects.json');
  }

  /**
   * Ensure the registry directory exists
   */
  private ensureRegistryDir(): void {
    const registryDir = this.fs.dirname(this.registryPath);
    if (!this.fs.exists(registryDir)) {
      this.fs.createDir(registryDir);
    }
  }

  /**
   * Load the project registry
   */
  private loadRegistry(): ProjectRegistryData {
    this.ensureRegistryDir();

    if (!this.fs.exists(this.registryPath)) {
      return {
        version: '1.0.0',
        projects: [],
      };
    }

    try {
      const content = this.fs.readFile(this.registryPath);
      return JSON.parse(content) as ProjectRegistryData;
    } catch {
      return {
        version: '1.0.0',
        projects: [],
      };
    }
  }

  /**
   * Save the project registry
   */
  private saveRegistry(registry: ProjectRegistryData): void {
    this.ensureRegistryDir();
    this.fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2));
  }

  /**
   * Register a new project
   */
  public registerProject(
    name: string,
    projectPath: ValidatedRepositoryPath,
    remoteUrl?: string
  ): void {
    const registry = this.loadRegistry();

    // Check if name already exists
    if (registry.projects.some((p) => p.name === name)) {
      throw new Error(`Project with name '${name}' already exists`);
    }

    // Check if path already registered
    const existingProject = registry.projects.find((p) => p.path === projectPath);
    if (existingProject) {
      throw new Error(`Path already registered as '${existingProject.name}'`);
    }

    const entry: AlexandriaEntry = {
      name,
      path: projectPath,
      remoteUrl,
      registeredAt: new Date().toISOString(),
      github: undefined, // Will be populated when fetching from GitHub
      hasViews: false, // Will be updated when scanning for views
      viewCount: 0,
      views: [],
    };

    registry.projects.push(entry);

    this.saveRegistry(registry);
  }

  /**
   * List all registered projects
   */
  public listProjects(): AlexandriaEntry[] {
    const registry = this.loadRegistry();
    return registry.projects;
  }

  /**
   * Get a project by name
   */
  public getProject(name: string): AlexandriaEntry | undefined {
    const registry = this.loadRegistry();
    return registry.projects.find((p) => p.name === name);
  }

  /**
   * Remove a project from the registry
   */
  public removeProject(name: string): boolean {
    const registry = this.loadRegistry();
    const initialLength = registry.projects.length;
    registry.projects = registry.projects.filter((p) => p.name !== name);

    if (registry.projects.length < initialLength) {
      this.saveRegistry(registry);
      return true;
    }

    return false;
  }

  /**
   * Update a project's metadata
   */
  public updateProject(
    name: string,
    updates: Partial<Omit<AlexandriaEntry, 'name' | 'registeredAt'>>
  ): void {
    const registry = this.loadRegistry();
    const projectIndex = registry.projects.findIndex((p) => p.name === name);

    if (projectIndex === -1) {
      throw new Error(`Project '${name}' not found`);
    }

    const project = registry.projects[projectIndex];

    // Special handling for path changes
    if (updates.path && updates.path !== project.path) {
      // Check if new path is already registered
      const existingWithPath = registry.projects.find(
        (p) => p.path === updates.path && p.name !== name
      );
      if (existingWithPath) {
        throw new Error(`Path already registered as '${existingWithPath.name}'`);
      }
    }

    // Apply all updates
    registry.projects[projectIndex] = {
      ...project,
      ...updates,
      // Preserve immutable fields
      name: project.name,
      registeredAt: project.registeredAt
    };

    this.saveRegistry(registry);
  }
}
