-- CreateTable
CREATE TABLE "external_job_postings" (
    "id"            TEXT        NOT NULL,
    "source"        TEXT        NOT NULL,
    "external_id"   TEXT,
    "link"          TEXT        NOT NULL,
    "title"         TEXT        NOT NULL,
    "category_name" TEXT,
    "published_at"  TIMESTAMP(3) NOT NULL,
    "raw"           JSONB       NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    "deleted_at"    TIMESTAMP(3),

    CONSTRAINT "external_job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_job_postings_deleted_at_idx" ON "external_job_postings"("deleted_at");

-- CreateIndex
CREATE INDEX "external_job_postings_published_at_idx" ON "external_job_postings"("published_at" DESC);

-- CreateIndex
CREATE INDEX "external_job_postings_source_idx" ON "external_job_postings"("source");

-- CreateIndex
CREATE INDEX "external_job_postings_category_name_idx" ON "external_job_postings"("category_name");

-- CreateIndex
CREATE INDEX "external_job_postings_source_deleted_at_idx" ON "external_job_postings"("source", "deleted_at");

-- CreateIndex
CREATE INDEX "external_job_postings_published_at_deleted_at_idx" ON "external_job_postings"("published_at" DESC, "deleted_at");

-- Partial unique indexes (Prisma DSL does not support WHERE predicates)

-- Primary dedup key: (source, external_id) when external_id is present
CREATE UNIQUE INDEX "uq_ejp_source_external_id"
  ON "external_job_postings" ("source", "external_id")
  WHERE "external_id" IS NOT NULL;

-- Fallback dedup key: (source, link) when external_id is absent
CREATE UNIQUE INDEX "uq_ejp_source_link"
  ON "external_job_postings" ("source", "link")
  WHERE "external_id" IS NULL;
