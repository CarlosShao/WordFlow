-- Trigram GIN indexes to back the content list full-text search.
-- The search uses Prisma `contains + mode: 'insensitive'` which compiles to
-- `ILIKE '%kw%'`; a plain btree index can't serve a leading-wildcard match,
-- so without these the query seq-scans and detoasts the whole `content`
-- column (~39MB) on every keystroke (debounced at 350ms client-side).
-- Idempotent so re-applying (e.g. after a manual docker-exec setup) is safe.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_contents_title_trgm ON contents USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contents_summary_trgm ON contents USING gin (summary gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contents_content_trgm ON contents USING gin (content gin_trgm_ops);
