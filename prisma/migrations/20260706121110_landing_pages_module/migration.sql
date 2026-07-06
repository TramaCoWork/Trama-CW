-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('text', 'email', 'tel', 'textarea', 'number', 'date', 'select', 'checkbox');

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_fields" (
    "id" SERIAL NOT NULL,
    "landing_id" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "options" TEXT[],

    CONSTRAINT "landing_page_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_submissions" (
    "id" SERIAL NOT NULL,
    "landing_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landing_page_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "landing_pages_uuid_key" ON "landing_pages"("uuid");

-- CreateIndex
CREATE INDEX "landing_page_fields_landing_id_order_idx" ON "landing_page_fields"("landing_id", "order");

-- CreateIndex
CREATE INDEX "landing_page_submissions_landing_id_created_at_idx" ON "landing_page_submissions"("landing_id", "created_at");

-- AddForeignKey
ALTER TABLE "landing_page_fields" ADD CONSTRAINT "landing_page_fields_landing_id_fkey" FOREIGN KEY ("landing_id") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_submissions" ADD CONSTRAINT "landing_page_submissions_landing_id_fkey" FOREIGN KEY ("landing_id") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;