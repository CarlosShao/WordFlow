-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('ARTICLE', 'VIDEO', 'PODCAST');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'PROFICIENT');

-- CreateEnum
CREATE TYPE "MasteryStatus" AS ENUM ('NOT_REVIEWED', 'NEW', 'LEARNING', 'REVIEWING', 'MASTERED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('CLOZE', 'READING_COMPREHENSION', 'GRAMMAR', 'VOCABULARY', 'LISTENING');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "CrawlerSourceType" AS ENUM ('RSS', 'YOUTUBE', 'TWITTER', 'WEB', 'PUPPETEER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "githubId" TEXT,
    "avatarUrl" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "author" TEXT,
    "difficulty" "Difficulty",
    "cover_url" TEXT,
    "summary" TEXT,
    "translation" TEXT,
    "segments" JSONB,
    "duration" INTEGER,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_content_interactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "is_favorited" BOOLEAN NOT NULL DEFAULT false,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "mastery" "MasteryStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "note" TEXT,
    "last_viewed_at" TIMESTAMP(3),
    "last_read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_content_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabularies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "phonetic" TEXT,
    "definition" TEXT,
    "translation" TEXT,
    "examples" JSONB,
    "etymology" TEXT,
    "tags" JSONB,
    "note" TEXT,
    "content_id" TEXT,
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "next_review_date" TIMESTAMP(3),
    "last_review_date" TIMESTAMP(3),
    "mastered_at" TIMESTAMP(3),
    "mastery_status" "MasteryStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabularies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content_id" TEXT,
    "title" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "total_questions" INTEGER NOT NULL,
    "correct_count" INTEGER NOT NULL,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "duration" INTEGER,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_questions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "vocabulary_id" TEXT,
    "content_id" TEXT,
    "type" "QuestionType" NOT NULL,
    "stem" TEXT NOT NULL,
    "options" JSONB,
    "correct_answer" TEXT NOT NULL,
    "user_answer" TEXT,
    "is_correct" BOOLEAN,
    "explanation" TEXT,
    "content_segment" TEXT,
    "difficulty" "Difficulty",
    "points" INTEGER NOT NULL DEFAULT 0,
    "time_spent" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mistakes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vocabulary_id" TEXT,
    "content_id" TEXT,
    "question_id" TEXT,
    "question_type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "user_answer" TEXT,
    "wrong_answer" TEXT,
    "explanation" TEXT,
    "content_segment" TEXT,
    "difficulty" "Difficulty",
    "mastery_status" "MasteryStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "last_wrong_at" TIMESTAMP(3),
    "last_review_date" TIMESTAMP(3),
    "next_review_date" TIMESTAMP(3),
    "mastered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mistakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawler_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "CrawlerSourceType" NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "crawl_interval" INTEGER NOT NULL DEFAULT 1440,
    "last_crawled_at" TIMESTAMP(3),
    "last_status" TEXT,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crawler_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "contents_type_created_at_idx" ON "contents"("type", "created_at");

-- CreateIndex
CREATE INDEX "contents_source_created_at_idx" ON "contents"("source", "created_at");

-- CreateIndex
CREATE INDEX "contents_processed_at_idx" ON "contents"("processed_at");

-- CreateIndex
CREATE INDEX "contents_created_by_idx" ON "contents"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "contents_source_source_url_key" ON "contents"("source", "source_url");

-- CreateIndex
CREATE INDEX "user_content_interactions_user_id_is_favorited_idx" ON "user_content_interactions"("user_id", "is_favorited");

-- CreateIndex
CREATE INDEX "user_content_interactions_user_id_mastery_idx" ON "user_content_interactions"("user_id", "mastery");

-- CreateIndex
CREATE UNIQUE INDEX "user_content_interactions_user_id_content_id_key" ON "user_content_interactions"("user_id", "content_id");

-- CreateIndex
CREATE INDEX "vocabularies_user_id_next_review_date_idx" ON "vocabularies"("user_id", "next_review_date");

-- CreateIndex
CREATE INDEX "vocabularies_user_id_created_at_idx" ON "vocabularies"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "vocabularies_user_id_mastery_status_idx" ON "vocabularies"("user_id", "mastery_status");

-- CreateIndex
CREATE UNIQUE INDEX "vocabularies_user_id_word_key" ON "vocabularies"("user_id", "word");

-- CreateIndex
CREATE INDEX "practice_sessions_user_id_created_at_idx" ON "practice_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "practice_sessions_user_id_status_idx" ON "practice_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "practice_questions_session_id_is_correct_idx" ON "practice_questions"("session_id", "is_correct");

-- CreateIndex
CREATE INDEX "practice_questions_vocabulary_id_idx" ON "practice_questions"("vocabulary_id");

-- CreateIndex
CREATE INDEX "mistakes_user_id_mastery_status_idx" ON "mistakes"("user_id", "mastery_status");

-- CreateIndex
CREATE INDEX "mistakes_user_id_next_review_date_idx" ON "mistakes"("user_id", "next_review_date");

-- CreateIndex
CREATE UNIQUE INDEX "mistakes_user_id_question_id_key" ON "mistakes"("user_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "mistakes_user_id_vocabulary_id_key" ON "mistakes"("user_id", "vocabulary_id");

-- CreateIndex
CREATE INDEX "crawler_sources_enabled_idx" ON "crawler_sources"("enabled");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_content_interactions" ADD CONSTRAINT "user_content_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_content_interactions" ADD CONSTRAINT "user_content_interactions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabularies" ADD CONSTRAINT "vocabularies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabularies" ADD CONSTRAINT "vocabularies_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_questions" ADD CONSTRAINT "practice_questions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "vocabularies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

