/**
 * In-memory adapter for Alexandria reading records
 * Useful for testing and temporary sessions (data is lost on page refresh)
 */

import type { 
  AlexandriaVisit, 
  AlexandriaBookmark, 
  AlexandriaLibraryCard,
} from '../../types/alexandria-state';

import type {
  ReadingRecordAdapter,
  VisitQuery,
  BookmarkQuery,
  StorageResult,
  StorageStats,
  StorageCapabilities
} from '../types';

export class MemoryReadingRecordAdapter implements ReadingRecordAdapter {
  private libraryCards: Map<string, AlexandriaLibraryCard> = new Map();
  private visits: Map<string, AlexandriaVisit> = new Map();
  private bookmarks: Map<string, AlexandriaBookmark> = new Map();
  private ready: boolean = false;
  private createdAt: Date = new Date();

  async initialize(): Promise<void> {
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  getName(): string {
    return 'memory';
  }

  getCapabilities(): StorageCapabilities {
    return {
      maxStorageSize: undefined, // No practical limit in memory
      supportsTransactions: true,
      supportsIndexing: true,
      supportsBackup: true,
      isVolatile: true // Data is lost on page refresh
    };
  }

  // Library Card operations
  async getLibraryCard(userId: string): Promise<StorageResult<AlexandriaLibraryCard | null>> {
    const card = this.libraryCards.get(userId) || null;
    return { success: true, data: card };
  }

  async saveLibraryCard(libraryCard: AlexandriaLibraryCard): Promise<StorageResult<void>> {
    this.libraryCards.set(libraryCard.id, libraryCard);
    return { success: true };
  }

  // Visit operations
  async createVisit(visit: AlexandriaVisit): Promise<StorageResult<AlexandriaVisit>> {
    this.visits.set(visit.id, visit);
    return { success: true, data: visit };
  }

  async getVisit(visitId: string): Promise<StorageResult<AlexandriaVisit | null>> {
    const visit = this.visits.get(visitId) || null;
    return { success: true, data: visit };
  }

  async updateVisit(visitId: string, updates: Partial<AlexandriaVisit>): Promise<StorageResult<void>> {
    const visit = this.visits.get(visitId);
    if (!visit) {
      return { success: false, error: 'Visit not found' };
    }
    
    this.visits.set(visitId, { ...visit, ...updates });
    return { success: true };
  }

  async deleteVisit(visitId: string): Promise<StorageResult<void>> {
    const visit = this.visits.get(visitId);
    if (!visit) {
      return { success: false, error: 'Visit not found' };
    }

    // Delete associated bookmarks
    visit.bookmarks.forEach(bookmark => {
      this.bookmarks.delete(bookmark.id);
    });
    
    this.visits.delete(visitId);
    return { success: true };
  }

  async queryVisits(query: VisitQuery): Promise<StorageResult<AlexandriaVisit[]>> {
    let visits = Array.from(this.visits.values());
    
    // Apply filters
    if (query.volumeId) {
      visits = visits.filter(visit => visit.volumeId === query.volumeId);
    }
    if (query.chapterId) {
      visits = visits.filter(visit => visit.chapterId === query.chapterId);
    }
    if (query.isActive !== undefined) {
      visits = visits.filter(visit => visit.isActive === query.isActive);
    }
    if (query.startDate) {
      visits = visits.filter(visit => visit.startedAt >= query.startDate!.getTime());
    }
    if (query.endDate) {
      visits = visits.filter(visit => visit.startedAt <= query.endDate!.getTime());
    }
    
    // Sort by most recent first
    visits.sort((a, b) => b.startedAt - a.startedAt);
    
    // Apply limit
    if (query.limit && query.limit > 0) {
      visits = visits.slice(0, query.limit);
    }
    
    return { success: true, data: visits };
  }

  // Bookmark operations
  async createBookmark(visitId: string, bookmark: AlexandriaBookmark): Promise<StorageResult<AlexandriaBookmark>> {
    const visit = this.visits.get(visitId);
    if (!visit) {
      return { success: false, error: 'Visit not found' };
    }
    
    this.bookmarks.set(bookmark.id, bookmark);
    visit.bookmarks.push(bookmark);
    
    return { success: true, data: bookmark };
  }

  async getBookmark(bookmarkId: string): Promise<StorageResult<AlexandriaBookmark | null>> {
    const bookmark = this.bookmarks.get(bookmarkId) || null;
    return { success: true, data: bookmark };
  }

  async updateBookmark(bookmarkId: string, updates: Partial<AlexandriaBookmark>): Promise<StorageResult<void>> {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) {
      return { success: false, error: 'Bookmark not found' };
    }
    
    const updatedBookmark = { ...bookmark, ...updates };
    this.bookmarks.set(bookmarkId, updatedBookmark);
    
    // Update bookmark in visits
    this.visits.forEach(visit => {
      const bookmarkIndex = visit.bookmarks.findIndex(b => b.id === bookmarkId);
      if (bookmarkIndex !== -1) {
        visit.bookmarks[bookmarkIndex] = updatedBookmark;
      }
    });
    
    return { success: true };
  }

  async deleteBookmark(bookmarkId: string): Promise<StorageResult<void>> {
    if (!this.bookmarks.has(bookmarkId)) {
      return { success: false, error: 'Bookmark not found' };
    }
    
    this.bookmarks.delete(bookmarkId);
    
    // Remove from visits
    this.visits.forEach(visit => {
      visit.bookmarks = visit.bookmarks.filter(b => b.id !== bookmarkId);
    });
    
    return { success: true };
  }

  async queryBookmarks(query: BookmarkQuery): Promise<StorageResult<AlexandriaBookmark[]>> {
    let bookmarks = Array.from(this.bookmarks.values());
    
    // Apply filters
    if (query.visitId) {
      const visit = this.visits.get(query.visitId);
      bookmarks = visit ? visit.bookmarks : [];
    } else if (query.volumeId || query.chapterId) {
      // Filter by visits that match volume/chapter
      const matchingVisits = Array.from(this.visits.values()).filter(visit => {
        return (!query.volumeId || visit.volumeId === query.volumeId) &&
               (!query.chapterId || visit.chapterId === query.chapterId);
      });
      const matchingBookmarkIds = new Set(
        matchingVisits.flatMap(visit => visit.bookmarks.map(b => b.id))
      );
      bookmarks = bookmarks.filter(bookmark => matchingBookmarkIds.has(bookmark.id));
    }
    
    if (query.createdAfter) {
      bookmarks = bookmarks.filter(bookmark => bookmark.createdAt >= query.createdAfter!.getTime());
    }
    
    // Sort by most recent first
    bookmarks.sort((a, b) => b.createdAt - a.createdAt);
    
    // Apply limit
    if (query.limit && query.limit > 0) {
      bookmarks = bookmarks.slice(0, query.limit);
    }
    
    return { success: true, data: bookmarks };
  }

  // Maintenance operations
  async cleanup(olderThan: Date): Promise<StorageResult<number>> {
    let deletedCount = 0;
    const cutoffTime = olderThan.getTime();
    
    // Find and delete old visits
    const visitsToDelete: string[] = [];
    this.visits.forEach((visit, visitId) => {
      if (visit.startedAt < cutoffTime && !visit.isActive) {
        visitsToDelete.push(visitId);
        
        // Delete associated bookmarks
        visit.bookmarks.forEach(bookmark => {
          this.bookmarks.delete(bookmark.id);
          deletedCount++;
        });
      }
    });
    
    visitsToDelete.forEach(visitId => {
      this.visits.delete(visitId);
      deletedCount++;
    });
    
    return { success: true, data: deletedCount };
  }

  async getStats(): Promise<StorageResult<StorageStats>> {
    const visitTimes = Array.from(this.visits.values()).map(v => v.startedAt);
    
    const stats: StorageStats = {
      totalVisits: this.visits.size,
      totalBookmarks: this.bookmarks.size,
      storageUsed: this.estimateMemoryUsage(),
      oldestVisit: visitTimes.length > 0 ? new Date(Math.min(...visitTimes)) : undefined,
      newestVisit: visitTimes.length > 0 ? new Date(Math.max(...visitTimes)) : undefined
    };
    
    return { success: true, data: stats };
  }

  async export(): Promise<StorageResult<string>> {
    const data = {
      libraryCards: Array.from(this.libraryCards.entries()),
      visits: Array.from(this.visits.entries()),
      bookmarks: Array.from(this.bookmarks.entries()),
      metadata: {
        version: '1.0.0',
        createdAt: this.createdAt.getTime(),
        exportedAt: Date.now()
      }
    };
    
    return { success: true, data: JSON.stringify(data, null, 2) };
  }

  async import(jsonData: string): Promise<StorageResult<void>> {
    try {
      const data = JSON.parse(jsonData);
      
      // Clear existing data
      this.libraryCards.clear();
      this.visits.clear();
      this.bookmarks.clear();
      
      // Import new data
      if (data.libraryCards) {
        data.libraryCards.forEach(([id, card]: [string, AlexandriaLibraryCard]) => {
          // Convert activeVisits back to Map if needed
          if (card.activeVisits && !(card.activeVisits instanceof Map)) {
            card.activeVisits = new Map(Object.entries(card.activeVisits));
          }
          this.libraryCards.set(id, card);
        });
      }
      
      if (data.visits) {
        data.visits.forEach(([id, visit]: [string, AlexandriaVisit]) => {
          this.visits.set(id, visit);
        });
      }
      
      if (data.bookmarks) {
        data.bookmarks.forEach(([id, bookmark]: [string, AlexandriaBookmark]) => {
          this.bookmarks.set(id, bookmark);
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to import data: ${error}` };
    }
  }

  // Private helper to estimate memory usage
  private estimateMemoryUsage(): number {
    // Rough estimation - serialize and measure string length
    const data = {
      libraryCards: Array.from(this.libraryCards.values()),
      visits: Array.from(this.visits.values()),
      bookmarks: Array.from(this.bookmarks.values())
    };
    
    return JSON.stringify(data).length * 2; // Approximate bytes (UTF-16)
  }
}