/**
 * Summary types for CodebaseViews
 * Lightweight representations for listing and preview purposes
 */

import type { CodebaseView } from "./index";

/**
 * Lightweight summary of a CodebaseView
 * Used for listings, previews, and remote access scenarios
 * where loading the full view would be expensive
 */
export interface CodebaseViewSummary {
  /** Unique identifier for the view */
  id: string;

  /** Display name of the view */
  name: string;

  /** Brief description of what the view represents */
  description: string;

  /** Number of reference groups in the view */
  referenceGroupCount: number;

  /** Dimensions of the grid as [rows, columns] */
  gridSize: [number, number];

  /** Path to overview/documentation file */
  overviewPath: string;

  /** Category for grouping and organizing views in UI (defaults to 'other' if not specified) */
  category: string;

  /** Display order within the category. Lower numbers appear first. */
  displayOrder: number;
}

/**
 * Extract a summary from a full CodebaseView
 * Calculates grid dimensions and cell count
 */
export function extractCodebaseViewSummary(
  view: CodebaseView,
): CodebaseViewSummary {
  let maxRow = 0;
  let maxCol = 0;
  const referenceGroupCount = Object.keys(view.referenceGroups).length;

  // Calculate grid dimensions from reference group coordinates
  for (const referenceGroup of Object.values(view.referenceGroups)) {
    if (
      referenceGroup.coordinates &&
      Array.isArray(referenceGroup.coordinates)
    ) {
      const [row, col] = referenceGroup.coordinates;
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
    }
  }

  return {
    id: view.id,
    name: view.name,
    description: view.description || "",
    referenceGroupCount,
    gridSize: [maxRow + 1, maxCol + 1], // +1 because coordinates are 0-indexed
    overviewPath: view.overviewPath || "",
    category: view.category || "other", // Default to 'other' for backward compatibility
    displayOrder: view.displayOrder || 0, // Default to 0 for backward compatibility
  };
}

/**
 * Create summaries for multiple views
 */
export function extractCodebaseViewSummaries(
  views: CodebaseView[],
): CodebaseViewSummary[] {
  return views.map(extractCodebaseViewSummary);
}
