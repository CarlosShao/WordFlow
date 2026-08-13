-- CreateEnum
CREATE TYPE "DictionaryStatus" AS ENUM ('PENDING', 'DONE', 'NOT_FOUND', 'FAILED');

-- CreateTable
CREATE TABLE "dictionary_entries" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "status" "DictionaryStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "payload" JSONB,
    "crawled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dictionary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_entries_word_key" ON "dictionary_entries"("word");

-- CreateIndex
CREATE INDEX "dictionary_entries_status_priority_idx" ON "dictionary_entries"("status", "priority");