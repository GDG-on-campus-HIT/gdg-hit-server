export const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Express parses `?role[$ne]=x` into an object; only accept plain strings in Mongo filters.
export const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

export const parsePagination = (
  page: unknown,
  limit: unknown,
  maxLimit = 100
): { pageNum: number; limitNum: number; skip: number } => {
  const pageNum = Math.max(parseInt(String(page ?? 1), 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(String(limit ?? 10), 10) || 10, 1), maxLimit);
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};
