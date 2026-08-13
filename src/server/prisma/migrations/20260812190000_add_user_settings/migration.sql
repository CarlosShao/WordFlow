-- Add user settings field for server-side preference persistence (theme, font size, etc.)
ALTER TABLE "users" ADD COLUMN "settings" JSONB;