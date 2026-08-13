-- CreateTable
CREATE TABLE "exam_books" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cover_url" TEXT,
    "year" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_questions" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stem" TEXT NOT NULL,
    "options" JSONB,
    "answer" JSONB NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "audio_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_questions_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "contents" ADD COLUMN "book_id" TEXT,
ADD COLUMN "book_order" INTEGER;

-- AlterTable
ALTER TABLE "practice_questions" ADD COLUMN "answer_json" JSONB,
ADD COLUMN "audio_url" TEXT,
ADD COLUMN "passage" TEXT,
ADD COLUMN "user_answer_json" JSONB;

-- CreateIndex
CREATE INDEX "exam_books_category_idx" ON "exam_books"("category");

-- CreateIndex
CREATE INDEX "content_questions_content_id_order_idx" ON "content_questions"("content_id", "order");

-- CreateIndex
CREATE INDEX "contents_book_id_idx" ON "contents"("book_id");

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "exam_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_questions" ADD CONSTRAINT "content_questions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;