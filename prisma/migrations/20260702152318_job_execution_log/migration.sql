-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "job_executions" (
    "id" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" "JobStatus" NOT NULL DEFAULT 'running',
    "duration_ms" INTEGER,
    "processed_count" INTEGER,
    "error_message" TEXT,
    "error_stack" TEXT,
    "metadata" JSONB,

    CONSTRAINT "job_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_executions_job_name_started_at_idx" ON "job_executions"("job_name", "started_at");
