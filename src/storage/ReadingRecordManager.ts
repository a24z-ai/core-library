/**
 * Reading Record Manager - Main entry point for Alexandria storage
 * Uses adapter pattern to abstract storage implementation
 */

import type {
  AlexandriaVisit,
  AlexandriaBookmark,
  AlexandriaLibraryCard,
} from "../types/alexandria-state";

import type {
  ReadingRecordAdapter,
  StorageConfig,
  VisitQuery,
  StorageStats,
} from "./types";

import { LocalStorageReadingRecordAdapter } from "./adapters/localStorage";
import { MemoryReadingRecordAdapter } from "./adapters/memory";

export class ReadingRecordManager {
  private adapter: ReadingRecordAdapter | null = null;
  private config: StorageConfig;
  private initPromise: Promise<void> | null = null;

  constructor(config: StorageConfig = { adapter: "localStorage" }) {
    this.config = config;
  }

  /**
   * Initialize the storage adapter
   * This must be called before using any other methods
   */
  async initialize(): Promise<void> {
    // Return existing initialization if in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeAdapter();
    return this.initPromise;
  }

  private async initializeAdapter(): Promise<void> {
    switch (this.config.adapter) {
      case "localStorage":
        this.adapter = new LocalStorageReadingRecordAdapter(
          this.config.options,
        );
        break;

      case "indexedDB":
        // To be implemented later
        throw new Error("IndexedDB adapter not yet implemented");

      case "memory":
        this.adapter = new MemoryReadingRecordAdapter();
        break;

      default:
        throw new Error(`Unknown adapter type: ${this.config.adapter}`);
    }

    await this.adapter.initialize();
  }

  /**
   * Ensure adapter is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.adapter || !this.adapter.isReady()) {
      throw new Error(
        "ReadingRecordManager not initialized. Call initialize() first.",
      );
    }
  }

  /**
   * Get the current storage adapter
   */
  getAdapter(): ReadingRecordAdapter | null {
    return this.adapter;
  }

  /**
   * Switch to a different storage adapter
   * Optionally migrate data from old adapter
   */
  async switchAdapter(
    newConfig: StorageConfig,
    migrateData: boolean = false,
  ): Promise<void> {
    const oldAdapter = this.adapter;
    let exportedData: string | undefined;

    // Export data from old adapter if migration requested
    if (migrateData && oldAdapter && oldAdapter.isReady()) {
      const exportResult = await oldAdapter.export();
      if (exportResult.success) {
        exportedData = exportResult.data;
      }
    }

    // Initialize new adapter
    this.config = newConfig;
    this.adapter = null;
    this.initPromise = null;
    await this.initialize();

    // Import data to new adapter if migration requested
    // After initialize(), adapter should be set
    if (migrateData && exportedData) {
      // Ensure adapter is properly initialized
      this.ensureInitialized();
      await this.adapter!.import(exportedData);
    }
  }

  // ============ Library Card Methods ============

  async getOrCreateLibraryCard(userId: string): Promise<AlexandriaLibraryCard> {
    this.ensureInitialized();

    const result = await this.adapter!.getLibraryCard(userId);

    if (result.success && result.data) {
      return result.data;
    }

    // Create new library card if it doesn't exist
    const newCard: AlexandriaLibraryCard = {
      id: userId,
      activeVisits: new Map(),
      visitHistory: [],
      preferences: {
        autoBookmark: false,
        bookmarkInterval: 5 * 60 * 1000, // 5 minutes
        showEditionChanges: true,
        preserveAnnotations: true,
      },
    };

    await this.adapter!.saveLibraryCard(newCard);
    return newCard;
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<AlexandriaLibraryCard["preferences"]>,
  ): Promise<void> {
    this.ensureInitialized();

    const card = await this.getOrCreateLibraryCard(userId);
    card.preferences = { ...card.preferences, ...preferences };

    const result = await this.adapter!.saveLibraryCard(card);
    if (!result.success) {
      throw new Error(result.error || "Failed to update preferences");
    }
  }

  // ============ Visit Methods ============

  async startVisit(
    userId: string,
    volumeId: string,
    chapterId: string,
    documentVersion: AlexandriaVisit["documentVersion"],
  ): Promise<AlexandriaVisit> {
    this.ensureInitialized();

    // Check for existing active visit
    const existingVisits = await this.adapter!.queryVisits({
      volumeId,
      chapterId,
      isActive: true,
    });

    if (
      existingVisits.success &&
      existingVisits.data &&
      existingVisits.data.length > 0
    ) {
      // Resume existing visit
      const visit = existingVisits.data[0];
      await this.adapter!.updateVisit(visit.id, {
        lastActiveAt: Date.now(),
        documentVersion,
      });
      return visit;
    }

    // Create new visit
    const visit: AlexandriaVisit = {
      id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      volumeId,
      chapterId,
      documentVersion,
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
      bookmarks: [],
      isActive: true,
    };

    const result = await this.adapter!.createVisit(visit);
    if (!result.success) {
      throw new Error(result.error || "Failed to create visit");
    }

    // Update library card
    const card = await this.getOrCreateLibraryCard(userId);
    card.activeVisits.set(`${volumeId}:${chapterId}`, visit);
    await this.adapter!.saveLibraryCard(card);

    return result.data!;
  }

  async endVisit(visitId: string): Promise<void> {
    this.ensureInitialized();

    const now = Date.now();
    const visitResult = await this.adapter!.getVisit(visitId);

    if (!visitResult.success || !visitResult.data) {
      throw new Error("Visit not found");
    }

    const visit = visitResult.data;
    const duration = now - visit.startedAt;

    await this.adapter!.updateVisit(visitId, {
      isActive: false,
      endedAt: now,
      lastActiveAt: now,
      readingDuration: duration,
    });
  }

  async updateVisitActivity(visitId: string): Promise<void> {
    this.ensureInitialized();

    await this.adapter!.updateVisit(visitId, {
      lastActiveAt: Date.now(),
    });
  }

  async getRecentVisits(
    volumeId?: string,
    limit: number = 10,
  ): Promise<AlexandriaVisit[]> {
    this.ensureInitialized();

    const query: VisitQuery = { limit };
    if (volumeId) {
      query.volumeId = volumeId;
    }

    const result = await this.adapter!.queryVisits(query);
    return result.success && result.data ? result.data : [];
  }

  // ============ Bookmark Methods ============

  async createBookmark(
    visitId: string,
    label?: string,
    context?: string,
  ): Promise<AlexandriaBookmark> {
    this.ensureInitialized();

    // Get the visit to get volumeId and chapterId
    const visitResult = await this.adapter!.getVisit(visitId);
    if (!visitResult.success || !visitResult.data) {
      throw new Error("Visit not found");
    }
    const visit = visitResult.data;

    const bookmark: AlexandriaBookmark = {
      id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      volumeId: visit.volumeId,
      chapterId: visit.chapterId,
      label,
      context,
      createdAt: Date.now(),
    };

    const result = await this.adapter!.createBookmark(visitId, bookmark);
    if (!result.success) {
      throw new Error(result.error || "Failed to create bookmark");
    }

    return result.data!;
  }

  async updateBookmarkVisit(bookmarkId: string): Promise<void> {
    this.ensureInitialized();

    await this.adapter!.updateBookmark(bookmarkId, {
      lastVisited: Date.now(),
    });
  }

  async getBookmarksForDocument(
    volumeId: string,
    chapterId: string,
    limit: number = 100,
  ): Promise<AlexandriaBookmark[]> {
    this.ensureInitialized();

    const result = await this.adapter!.queryBookmarks({
      volumeId,
      chapterId,
      limit,
    });

    return result.success && result.data ? result.data : [];
  }

  async deleteBookmark(bookmarkId: string): Promise<void> {
    this.ensureInitialized();

    const result = await this.adapter!.deleteBookmark(bookmarkId);
    if (!result.success) {
      throw new Error(result.error || "Failed to delete bookmark");
    }
  }

  // ============ Maintenance Methods ============

  async performCleanup(daysOld: number = 90): Promise<number> {
    this.ensureInitialized();

    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await this.adapter!.cleanup(cutoffDate);

    return result.success && result.data ? result.data : 0;
  }

  async getStorageStats(): Promise<StorageStats> {
    this.ensureInitialized();

    const result = await this.adapter!.getStats();
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to get storage stats");
    }

    return result.data;
  }

  async exportData(): Promise<string> {
    this.ensureInitialized();

    const result = await this.adapter!.export();
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to export data");
    }

    return result.data;
  }

  async importData(jsonData: string): Promise<void> {
    this.ensureInitialized();

    const result = await this.adapter!.import(jsonData);
    if (!result.success) {
      throw new Error(result.error || "Failed to import data");
    }
  }
}
