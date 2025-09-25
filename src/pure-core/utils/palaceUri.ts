/**
 * Utilities for working with Palace URIs
 * Format: palace://host/resourceType/resourceId
 * Examples:
 *   palace://local/room/room-id
 *   palace://github.com/user/repo/view/view-id
 *   palace:///absolute/path/to/repo/note/note-id
 */

import type {
  PalaceURI,
  CrossPalaceReference,
  PalaceResourceType,
} from '../types/palace-portal';

/**
 * Parse a Palace URI string into its components
 */
export function parsePalaceUri(uri: string): PalaceURI | null {
  // Basic validation
  if (!uri.startsWith('palace://')) {
    return null;
  }

  try {
    // Remove the protocol
    const withoutProtocol = uri.substring('palace://'.length);

    // Split by '/' to get components
    const parts = withoutProtocol.split('/');

    if (parts.length < 3) {
      return null;
    }

    // The last two parts are always resourceType/resourceId
    // Everything before that is the host
    const resourceIdIndex = parts.length - 1;
    const resourceTypeIndex = parts.length - 2;

    const resourceType = parts[resourceTypeIndex] as PalaceResourceType;
    const resourceId = parts[resourceIdIndex];

    // Join all parts before resourceType to form the host
    const hostParts = parts.slice(0, resourceTypeIndex);
    const host = hostParts.join('/') || 'local';

    // Validate resource type
    const validTypes: PalaceResourceType[] = ['room', 'view', 'note', 'drawing'];
    if (!validTypes.includes(resourceType)) {
      return null;
    }

    // Parse query and fragment if present
    let query: Record<string, string> | undefined;
    let fragment: string | undefined;

    let finalResourceId = resourceId;

    // Check for fragment
    const fragmentIndex = finalResourceId.indexOf('#');
    if (fragmentIndex > -1) {
      fragment = finalResourceId.substring(fragmentIndex + 1);
      finalResourceId = finalResourceId.substring(0, fragmentIndex);
    }

    // Check for query
    const queryIndex = finalResourceId.indexOf('?');
    if (queryIndex > -1) {
      const queryString = finalResourceId.substring(queryIndex + 1);
      finalResourceId = finalResourceId.substring(0, queryIndex);

      // Parse query parameters
      query = {};
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        query![key] = value;
      });
    }

    return {
      protocol: 'palace',
      host,
      resourceType,
      resourceId: finalResourceId,
      query,
      fragment,
    };
  } catch (error) {
    console.error('Failed to parse Palace URI:', error);
    return null;
  }
}

/**
 * Build a Palace URI string from components
 */
export function buildPalaceUri(components: Omit<PalaceURI, 'protocol'>): string {
  let uri = `palace://${components.host}/${components.resourceType}/${components.resourceId}`;

  // Add query parameters if present
  if (components.query && Object.keys(components.query).length > 0) {
    const params = new URLSearchParams(components.query);
    uri += `?${params.toString()}`;
  }

  // Add fragment if present
  if (components.fragment) {
    uri += `#${components.fragment}`;
  }

  return uri;
}

/**
 * Create a cross-palace reference
 */
export function createCrossPalaceReference(uri: string): CrossPalaceReference {
  const parsed = parsePalaceUri(uri);

  return {
    uri,
    parsed: parsed || undefined,
    status: parsed ? 'pending' : 'broken',
    error: parsed ? undefined : 'Invalid Palace URI format',
  };
}

/**
 * Build a Palace URI for a local resource
 */
export function buildLocalPalaceUri(
  repositoryPath: string,
  resourceType: PalaceResourceType,
  resourceId: string
): string {
  // For local paths, use the absolute path as the host
  const host = repositoryPath.startsWith('/') ? repositoryPath : `local/${repositoryPath}`;

  return buildPalaceUri({
    host,
    resourceType,
    resourceId,
  });
}

/**
 * Build a Palace URI for a GitHub resource
 */
export function buildGitHubPalaceUri(
  owner: string,
  repo: string,
  resourceType: PalaceResourceType,
  resourceId: string,
  branch?: string
): string {
  const host = `github.com/${owner}/${repo}`;
  const query = branch ? { branch } : undefined;

  return buildPalaceUri({
    host,
    resourceType,
    resourceId,
    query,
  });
}

/**
 * Check if a URI is a Palace URI
 */
export function isPalaceUri(uri: string): boolean {
  return uri.startsWith('palace://');
}

/**
 * Extract repository information from a Palace URI
 */
export function extractRepositoryFromUri(uri: PalaceURI): {
  type: 'local' | 'github' | 'other';
  path?: string;
  owner?: string;
  repo?: string;
  branch?: string;
} {
  const { host, query } = uri;

  // Check if it's a GitHub URI
  if (host.startsWith('github.com/')) {
    const parts = host.substring('github.com/'.length).split('/');
    if (parts.length >= 2) {
      return {
        type: 'github',
        owner: parts[0],
        repo: parts[1],
        branch: query?.branch,
      };
    }
  }

  // Check if it's an absolute path (starts with /)
  if (host.startsWith('/')) {
    return {
      type: 'local',
      path: host,
    };
  }

  // Check if it's explicitly local
  if (host === 'local') {
    return {
      type: 'local',
      path: '.',
    };
  }

  if (host.startsWith('local/')) {
    return {
      type: 'local',
      path: host.substring('local/'.length),
    };
  }

  // Other types (GitLab, Bitbucket, etc.)
  return {
    type: 'other',
    path: host,
  };
}