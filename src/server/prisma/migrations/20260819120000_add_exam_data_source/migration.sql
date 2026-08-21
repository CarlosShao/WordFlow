-- AlterEnum
ALTER TYPE "ExamCategory" ADD VALUE IF NOT EXISTS 'GRE';
ALTER TYPE "ExamCategory" ADD VALUE IF NOT EXISTS 'CET4';
ALTER TYPE "ExamCategory" ADD VALUE IF NOT EXISTS 'CET6';
ALTER TYPE "ExamCategory" ADD VALUE IF NOT EXISTS 'KAOYAN';

-- CreateEnum
CREATE TYPE "BookDataSource" AS ENUM ('LEGACY', 'CURATED', 'OFFICIAL', 'OPENSOURCE');

-- AlterTable
ALTER TABLE "exam_books" ADD COLUMN "data_source" "BookDataSource" NOT NULL DEFAULT 'LEGACY';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "exam_books_data_source_idx" ON "exam_books"("data_source");
