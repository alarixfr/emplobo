-- Manual content editor — stable authored order for quiz questions.
ALTER TABLE "QuizQuestion" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Index the new column alongside quizId (replaces the old quizId-only index).
CREATE INDEX "QuizQuestion_quizId_order_idx" ON "QuizQuestion"("quizId", "order");
DROP INDEX "QuizQuestion_quizId_idx";
