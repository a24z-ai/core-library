/**
 * LocalStorage adapter for Alexandria reading records
 * Simple implementation using browser localStorage with JSON serialization
 */

/* global localStorage */

import type {
  AlexandriaVisit,
  AlexandriaBookmark,
  AlexandriaLibraryCard,
} from "../../types/alexandria-state";

import type {
  ReadingRecordAdapter,
  VisitQuery,
  BookmarkQuery,
  StorageResult,
  StorageStats,
  StorageCapabilities,
} from "../types";

// Serialized version of AlexandriaLibraryCard for localStorage
interface SerializedLibraryCard {
  id: string;
  activeVisits: Record<string, AlexandriaVisit>; // Map serialized as object
  visitHistory: AlexandriaVisit[];
  preferences: AlexandriaLibraryCard["preferences"];
}

interface LocalStorageData {
  libraryCards: Record<string, SerializedLibraryCard>;
  visits: Record<string, AlexandriaVisit>;
  bookmarks: Record<string, AlexandriaBookmark>;
  metadata: {
    version: string;
    createdAt: number;
    lastCleanup: number;
  };
}

export class LocalStorageReadingRecordAdapter implements ReadingRecordAdapter {
  private keyPrefix: string;
  private ready: boolean = false;
  private maxEntries: number;

  constructor(options: { keyPrefix?: string; maxEntries?: number } = {}) {
    this.keyPrefix = options.keyPrefix || "alexandria_";
    this.maxEntries = options.maxEntries || 1000;
  }

  async initialize(): Promise<void> {
    try {
      // Test localStorage availability
      const testKey = `${this.keyPrefix}test`;
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);

      // Initialize data structure if it doesn't exist
      if (!this.getData()) {
        this.saveData({
          libraryCards: {},
          visits: {},
          bookmarks: {},
          metadata: {
            version: "1.0.0",
            createdAt: Date.now(),
            lastCleanup: Date.now(),
          },
        });
      }

      this.ready = true;
    } catch (error) {
      throw new Error(`Failed to initialize localStorage adapter: ${error}`);
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getName(): string {
    return "localStorage";
  }

  getCapabilities(): StorageCapabilities {
    return {
      maxStorageSize: 5 * 1024 * 1024, // ~5MB typical localStorage limit
      supportsTransactions: false,
      supportsIndexing: false,
      supportsBackup: true,
      isVolatile: false,
    };
  }

  // Library Card operations
  async getLibraryCard(
    userId: string,
  ): Promise<StorageResult<AlexandriaLibraryCard | null>> {
    try {
      const data = this.getData();
      const serializedCard = data?.libraryCards[userId] || null;

      if (!serializedCard) {
        return { success: true, data: null };
      }

      // Convert back to AlexandriaLibraryCard with Map
      const libraryCard: AlexandriaLibraryCard = {
        ...serializedCard,
        activeVisits: new Map(Object.entries(serializedCard.activeVisits)),
      };

      return { success: true, data: libraryCard };
    } catch (error) {
      return { success: false, error: `Failed to get library card: ${error}` };
    }
  }

  async saveLibraryCard(
    libraryCard: AlexandriaLibraryCard,
  ): Promise<StorageResult<void>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      // Convert Map to plain object for JSON serialization
      const cardToSave: SerializedLibraryCard = {
        ...libraryCard,
        activeVisits:
          libraryCard.activeVisits instanceof Map
            ? Object.fromEntries(libraryCard.activeVisits)
            : (libraryCard.activeVisits as Record<string, AlexandriaVisit>),
      };

      data.libraryCards[libraryCard.id] = cardToSave;
      this.saveData(data);

      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to save library card: ${error}` };
    }
  }

  // Visit operations
  async createVisit(
    visit: AlexandriaVisit,
  ): Promise<StorageResult<AlexandriaVisit>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      // Check if we're at max capacity
      if (Object.keys(data.visits).length >= this.maxEntries) {
        await this.cleanup(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Clean 30+ day old visits
      }

      data.visits[visit.id] = visit;
      this.saveData(data);

      return { success: true, data: visit };
    } catch (error) {
      return { success: false, error: `Failed to create visit: ${error}` };
    }
  }

  async getVisit(
    visitId: string,
  ): Promise<StorageResult<AlexandriaVisit | null>> {
    try {
      const data = this.getData();
      const visit = data?.visits[visitId] || null;
      return { success: true, data: visit };
    } catch (error) {
      return { success: false, error: `Failed to get visit: ${error}` };
    }
  }

  async updateVisit(
    visitId: string,
    updates: Partial<AlexandriaVisit>,
  ): Promise<StorageResult<void>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      const existingVisit = data.visits[visitId];
      if (!existingVisit) {
        return { success: false, error: "Visit not found" };
      }

      data.visits[visitId] = { ...existingVisit, ...updates };
      this.saveData(data);

      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to update visit: ${error}` };
    }
  }

  async deleteVisit(visitId: string): Promise<StorageResult<void>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      // Also delete associated bookmarks
      const bookmarksToDelete = Object.entries(data.bookmarks)
        .filter(([, bookmark]) =>
          data.visits[visitId]?.bookmarks.some((b) => b.id === bookmark.id),
        )
        .map(([id]) => id);

      bookmarksToDelete.forEach((id) => delete data.bookmarks[id]);
      delete data.visits[visitId];

      this.saveData(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to delete visit: ${error}` };
    }
  }

  async queryVisits(
    query: VisitQuery,
  ): Promise<StorageResult<AlexandriaVisit[]>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      let visits = Object.values(data.visits);

      // Apply filters
      if (query.volumeId) {
        visits = visits.filter((visit) => visit.volumeId === query.volumeId);
      }
      if (query.chapterId) {
        visits = visits.filter((visit) => visit.chapterId === query.chapterId);
      }
      if (query.isActive !== undefined) {
        visits = visits.filter((visit) => visit.isActive === query.isActive);
      }
      if (query.startDate) {
        visits = visits.filter(
          (visit) => visit.startedAt >= query.startDate!.getTime(),
        );
      }
      if (query.endDate) {
        visits = visits.filter(
          (visit) => visit.startedAt <= query.endDate!.getTime(),
        );
      }

      // Sort by most recent first
      visits.sort((a, b) => b.startedAt - a.startedAt);

      // Apply limit
      if (query.limit && query.limit > 0) {
        visits = visits.slice(0, query.limit);
      }

      return { success: true, data: visits };
    } catch (error) {
      return { success: false, error: `Failed to query visits: ${error}` };
    }
  }

  // Bookmark operations
  async createBookmark(
    visitId: string,
    bookmark: AlexandriaBookmark,
  ): Promise<StorageResult<AlexandriaBookmark>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      const visit = data.visits[visitId];
      if (!visit) {
        return { success: false, error: "Visit not found" };
      }

      // Ensure bookmark has volumeId and chapterId from the visit
      const enrichedBookmark = {
        ...bookmark,
        volumeId: visit.volumeId,
        chapterId: visit.chapterId,
      };

      // Add bookmark to both the bookmarks collection and the visit
      data.bookmarks[enrichedBookmark.id] = enrichedBookmark;
      visit.bookmarks.push(enrichedBookmark);

      this.saveData(data);
      return { success: true, data: enrichedBookmark };
    } catch (error) {
      return { success: false, error: `Failed to create bookmark: ${error}` };
    }
  }

  async getBookmark(
    bookmarkId: string,
  ): Promise<StorageResult<AlexandriaBookmark | null>> {
    try {
      const data = this.getData();
      const bookmark = data?.bookmarks[bookmarkId] || null;
      return { success: true, data: bookmark };
    } catch (error) {
      return { success: false, error: `Failed to get bookmark: ${error}` };
    }
  }

  async updateBookmark(
    bookmarkId: string,
    updates: Partial<AlexandriaBookmark>,
  ): Promise<StorageResult<void>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      const existingBookmark = data.bookmarks[bookmarkId];
      if (!existingBookmark) {
        return { success: false, error: "Bookmark not found" };
      }

      const updatedBookmark = { ...existingBookmark, ...updates };
      data.bookmarks[bookmarkId] = updatedBookmark;

      // Also update the bookmark in any visits that reference it
      Object.values(data.visits).forEach((visit) => {
        const bookmarkIndex = visit.bookmarks.findIndex(
          (b) => b.id === bookmarkId,
        );
        if (bookmarkIndex !== -1) {
          visit.bookmarks[bookmarkIndex] = updatedBookmark;
        }
      });

      this.saveData(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to update bookmark: ${error}` };
    }
  }

  async deleteBookmark(bookmarkId: string): Promise<StorageResult<void>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      // Remove from bookmarks collection
      delete data.bookmarks[bookmarkId];

      // Remove from any visits that reference it
      Object.values(data.visits).forEach((visit) => {
        visit.bookmarks = visit.bookmarks.filter((b) => b.id !== bookmarkId);
      });

      this.saveData(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to delete bookmark: ${error}` };
    }
  }

  async queryBookmarks(
    query: BookmarkQuery,
  ): Promise<StorageResult<AlexandriaBookmark[]>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      let bookmarks = Object.values(data.bookmarks);

      // Apply filters
      if (query.visitId) {
        const visit = data.visits[query.visitId];
        if (visit) {
          bookmarks = visit.bookmarks;
        } else {
          bookmarks = [];
        }
      }
      if (query.volumeId || query.chapterId) {
        // Query bookmarks directly by volumeId/chapterId (not through visits)
        bookmarks = bookmarks.filter((bookmark) => {
          return (
            (!query.volumeId || bookmark.volumeId === query.volumeId) &&
            (!query.chapterId || bookmark.chapterId === query.chapterId)
          );
        });
      }
      if (query.createdAfter) {
        bookmarks = bookmarks.filter(
          (bookmark) => bookmark.createdAt >= query.createdAfter!.getTime(),
        );
      }

      // Sort by most recent first
      bookmarks.sort((a, b) => b.createdAt - a.createdAt);

      // Apply limit
      if (query.limit && query.limit > 0) {
        bookmarks = bookmarks.slice(0, query.limit);
      }

      return { success: true, data: bookmarks };
    } catch (error) {
      return { success: false, error: `Failed to query bookmarks: ${error}` };
    }
  }

  // Maintenance operations
  async cleanup(olderThan: Date): Promise<StorageResult<number>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      let deletedCount = 0;
      const cutoffTime = olderThan.getTime();

      // Find visits older than cutoff that are not active
      const visitsToDelete = Object.entries(data.visits).filter(
        ([, visit]) => visit.startedAt < cutoffTime && !visit.isActive,
      );

      // Delete old visits and their bookmarks
      visitsToDelete.forEach(([visitId, visit]) => {
        // Delete associated bookmarks
        visit.bookmarks.forEach((bookmark) => {
          delete data.bookmarks[bookmark.id];
          deletedCount++;
        });

        delete data.visits[visitId];
        deletedCount++;
      });

      data.metadata.lastCleanup = Date.now();
      this.saveData(data);

      return { success: true, data: deletedCount };
    } catch (error) {
      return { success: false, error: `Failed to cleanup: ${error}` };
    }
  }

  async getStats(): Promise<StorageResult<StorageStats>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      const visits = Object.values(data.visits);
      const visitTimes = visits.map((v) => v.startedAt);

      const stats: StorageStats = {
        totalVisits: visits.length,
        totalBookmarks: Object.keys(data.bookmarks).length,
        storageUsed: this.getStorageSize(),
        oldestVisit:
          visitTimes.length > 0 ? new Date(Math.min(...visitTimes)) : undefined,
        newestVisit:
          visitTimes.length > 0 ? new Date(Math.max(...visitTimes)) : undefined,
      };

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: `Failed to get stats: ${error}` };
    }
  }

  async export(): Promise<StorageResult<string>> {
    try {
      const data = this.getData();
      if (!data) throw new Error("Storage not initialized");

      return { success: true, data: JSON.stringify(data, null, 2) };
    } catch (error) {
      return { success: false, error: `Failed to export: ${error}` };
    }
  }

  async import(jsonData: string): Promise<StorageResult<void>> {
    try {
      const data = JSON.parse(jsonData) as LocalStorageData;
      this.saveData(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to import: ${error}` };
    }
  }

  // Private helper methods
  private getData(): LocalStorageData | null {
    try {
      const data = localStorage.getItem(`${this.keyPrefix}reading_records`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveData(data: LocalStorageData): void {
    localStorage.setItem(
      `${this.keyPrefix}reading_records`,
      JSON.stringify(data),
    );
  }

  private getStorageSize(): number {
    try {
      const data = localStorage.getItem(`${this.keyPrefix}reading_records`);
      return new Blob([data || ""]).size;
    } catch {
      return 0;
    }
  }
}
