/**
 * Pure DrawingStore - Platform-agnostic drawing storage
 *
 * This version uses dependency injection with FileSystemAdapter to work in any environment
 * Handles Excalidraw and other drawing formats
 */

import { FileSystemAdapter } from "../abstractions/filesystem";
import { ValidatedAlexandriaPath } from "../types/repository";

export interface DrawingMetadata {
  id: string;
  name: string;
  format: "excalidraw" | "svg" | "png";
  created: string;
  modified: string;
  size: number;
}

/**
 * Pure DrawingStore - Platform-agnostic drawing storage using FileSystemAdapter
 */
export class DrawingStore {
  private fs: FileSystemAdapter;
  private alexandriaPath: ValidatedAlexandriaPath;
  private drawingsDir: string;

  constructor(
    fileSystemAdapter: FileSystemAdapter,
    alexandriaPath: ValidatedAlexandriaPath,
  ) {
    this.fs = fileSystemAdapter;
    this.alexandriaPath = alexandriaPath;
    this.drawingsDir = this.fs.join(alexandriaPath, "drawings");
    // Ensure drawings directory exists
    this.fs.createDir(this.drawingsDir);
  }

  /**
   * Save a drawing to storage
   */
  saveDrawing(name: string, content: string): void {
    this.ensureDrawingsDirectory();

    const fileName = this.normalizeDrawingName(name);
    const filePath = this.fs.join(this.drawingsDir, fileName);

    // For now, save as text since Excalidraw files are JSON
    // Later we can optimize with binary if needed
    this.fs.writeFile(filePath, content);
  }

  /**
   * Save a binary drawing (PNG, etc)
   */
  saveBinaryDrawing(name: string, content: Uint8Array): void {
    this.ensureDrawingsDirectory();

    const fileName = this.normalizeDrawingName(name);
    const filePath = this.fs.join(this.drawingsDir, fileName);

    this.fs.writeBinaryFile(filePath, content);
  }

  /**
   * Load a drawing from storage
   */
  loadDrawing(name: string): string | null {
    const fileName = this.normalizeDrawingName(name);
    const filePath = this.fs.join(this.drawingsDir, fileName);

    if (!this.fs.exists(filePath)) {
      return null;
    }

    try {
      return this.fs.readFile(filePath);
    } catch (error) {
      console.error(`Error reading drawing ${name}:`, error);
      return null;
    }
  }

  /**
   * Load a binary drawing
   */
  loadBinaryDrawing(name: string): Uint8Array | null {
    const fileName = this.normalizeDrawingName(name);
    const filePath = this.fs.join(this.drawingsDir, fileName);

    if (!this.fs.exists(filePath)) {
      return null;
    }

    try {
      return this.fs.readBinaryFile(filePath);
    } catch (error) {
      console.error(`Error reading binary drawing ${name}:`, error);
      return null;
    }
  }

  /**
   * List all drawings in storage
   */
  listDrawings(): string[] {
    if (!this.fs.exists(this.drawingsDir)) {
      return [];
    }

    const files = this.fs.readDir(this.drawingsDir);
    return files.filter(
      (f) =>
        f.endsWith(".excalidraw") || f.endsWith(".svg") || f.endsWith(".png"),
    );
  }

  /**
   * List drawings with metadata
   */
  listDrawingsWithMetadata(): DrawingMetadata[] {
    const drawings = this.listDrawings();
    const metadata: DrawingMetadata[] = [];

    for (const fileName of drawings) {
      // Extract format from extension
      const format = fileName.endsWith(".excalidraw")
        ? "excalidraw"
        : fileName.endsWith(".svg")
          ? "svg"
          : fileName.endsWith(".png")
            ? "png"
            : "excalidraw";

      // For now, we'll use file name as ID and name
      // In future, could read file stats for dates and size
      metadata.push({
        id: fileName,
        name: fileName,
        format: format as "excalidraw" | "svg" | "png",
        created: new Date().toISOString(), // Would need file stats
        modified: new Date().toISOString(), // Would need file stats
        size: 0, // Would need file stats
      });
    }

    return metadata;
  }

  /**
   * Delete a drawing
   */
  deleteDrawing(name: string): boolean {
    const fileName = this.normalizeDrawingName(name);
    const filePath = this.fs.join(this.drawingsDir, fileName);

    if (this.fs.exists(filePath)) {
      this.fs.deleteFile(filePath);
      return true;
    }

    return false;
  }

  /**
   * Rename a drawing
   */
  renameDrawing(oldName: string, newName: string): boolean {
    const oldFileName = this.normalizeDrawingName(oldName);
    const newFileName = this.normalizeDrawingName(newName);

    const oldPath = this.fs.join(this.drawingsDir, oldFileName);
    const newPath = this.fs.join(this.drawingsDir, newFileName);

    if (!this.fs.exists(oldPath)) {
      return false;
    }

    if (this.fs.exists(newPath)) {
      console.error(`Drawing ${newName} already exists`);
      return false;
    }

    try {
      const content = this.fs.readFile(oldPath);
      this.fs.writeFile(newPath, content);
      this.fs.deleteFile(oldPath);
      return true;
    } catch (error) {
      console.error(
        `Error renaming drawing from ${oldName} to ${newName}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if a drawing exists
   */
  drawingExists(name: string): boolean {
    const fileName = this.normalizeDrawingName(name);
    const filePath = this.fs.join(this.drawingsDir, fileName);
    return this.fs.exists(filePath);
  }

  /**
   * Ensure the drawings directory exists
   */
  private ensureDrawingsDirectory(): void {
    if (!this.fs.exists(this.drawingsDir)) {
      this.fs.createDir(this.drawingsDir);
    }
  }

  /**
   * Normalize drawing name - ensure it has proper extension
   */
  private normalizeDrawingName(name: string): string {
    // If no extension, assume .excalidraw
    if (!name.includes(".")) {
      return `${name}.excalidraw`;
    }
    return name;
  }
}
