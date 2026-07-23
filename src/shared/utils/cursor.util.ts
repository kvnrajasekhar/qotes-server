/**
 * Cursor Utility for consistent cursor-based pagination
 * Supports single-field and compound cursors with proper encoding/decoding
 */

export interface CursorData {
  [key: string]: string | number | Date;
}

/**
 * Encode cursor data to a base64 string
 * @param data - Object containing cursor fields (e.g., { createdAt, id })
 * @returns Base64 encoded string
 */
export function encodeCursor(data: CursorData): string {
  const jsonString = JSON.stringify(data);
  return Buffer.from(jsonString).toString("base64");
}

/**
 * Decode base64 cursor string to object
 * @param cursor - Base64 encoded cursor string
 * @returns Decoded cursor data object
 */
export function decodeCursor(cursor: string): CursorData {
  try {
    const jsonString = Buffer.from(cursor, "base64").toString("utf-8");
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error("Invalid cursor format");
  }
}

/**
 * Build MongoDB query from cursor for single-field pagination
 * @param cursor - Cursor string or null
 * @param field - Field name to paginate on (e.g., 'createdAt', '_id')
 * @param direction - Sort direction: -1 for descending, 1 for ascending
 * @returns MongoDB query object
 */
export function buildCursorQuery(
  cursor: string | null,
  field: string,
  direction: -1 | 1 = -1,
): any {
  if (!cursor) return {};

  const decoded = decodeCursor(cursor);
  const value = decoded[field];

  if (direction === -1) {
    return { [field]: { $lt: value } };
  } else {
    return { [field]: { $gt: value } };
  }
}

/**
 * Build MongoDB query from cursor for compound pagination (tie-breaker)
 * @param cursor - Cursor string or null
 * @param fields - Array of field names in sort order (e.g., ['createdAt', '_id'])
 * @param directions - Array of sort directions matching fields
 * @returns MongoDB query object with $or for tie-breaking
 */
export function buildCompoundCursorQuery(
  cursor: string | null,
  fields: string[],
  directions: (-1 | 1)[],
): any {
  if (!cursor) return {};

  const decoded = decodeCursor(cursor);
  const query: any = { $or: [] };

  // Build compound query for tie-breaking
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const direction = directions[i];
    const value = decoded[field];

    const condition: any = {};

    // Add equality conditions for all previous fields
    for (let j = 0; j < i; j++) {
      condition[fields[j]] = decoded[fields[j]];
    }

    // Add inequality condition for current field
    if (direction === -1) {
      condition[field] = { $lt: value };
    } else {
      condition[field] = { $gt: value };
    }

    query.$or.push(condition);
  }

  return query;
}

/**
 * Extract next cursor from results
 * @param results - Array of results
 * @param limit - Original limit requested
 * @param fields - Fields to include in cursor (for compound cursors)
 * @returns Next cursor string or null
 */
export function getNextCursor(
  results: any[],
  limit: number,
  fields: string[] = ["createdAt"],
): string | null {
  if (results.length <= limit) return null;

  const lastItem = results[results.length - 1];
  const cursorData: CursorData = {};

  fields.forEach((field) => {
    cursorData[field] = lastItem[field];
  });

  return encodeCursor(cursorData);
}

/**
 * Standard pagination response structure
 */
export interface PaginationResponse {
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Process paginated results - removes extra item and builds pagination response
 * @param results - Results array with limit + 1 items
 * @param limit - Original limit requested
 * @param cursorFields - Fields to include in next cursor
 * @returns Object with results and pagination info
 */
export function processPaginatedResults<T>(
  results: T[],
  limit: number,
  cursorFields: string[] = ["createdAt"],
): { data: T[]; pagination: PaginationResponse } {
  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, limit) : results;

  return {
    data,
    pagination: {
      nextCursor:
        hasMore && data.length > 0
          ? encodeCursor(
              cursorFields.reduce((acc, field) => {
                acc[field] = (data[data.length - 1] as any)[field];
                return acc;
              }, {} as CursorData),
            )
          : null,
      hasMore,
    },
  };
}
