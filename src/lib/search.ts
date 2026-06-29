/**
 * Commas and parentheses are syntactically significant in PostgREST's
 * `.or()` filter string (they delimit/group conditions), so a search term
 * containing them would silently break the query rather than just not match.
 * ILIKE is already case-insensitive, so no case handling is needed here.
 */
export function sanitizeSearchTerm(term: string): string {
  return term.trim().replace(/[,()]/g, "");
}
