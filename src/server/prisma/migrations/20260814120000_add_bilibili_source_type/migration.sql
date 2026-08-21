-- Add BILIBILI to CrawlerSourceType enum (safe append, no data loss)
ALTER TYPE "CrawlerSourceType" ADD VALUE IF NOT EXISTS 'BILIBILI';
