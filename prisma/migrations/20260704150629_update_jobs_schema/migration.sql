/*
  Warnings:

  - You are about to drop the column `created_by_admin` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `jobs` table. All the data in the column will be lost.
  - Added the required column `email` to the `jobs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobStatus" ADD VALUE 'active';
ALTER TYPE "JobStatus" ADD VALUE 'paused';

-- DropForeignKey
ALTER TABLE "job_applications" DROP CONSTRAINT "job_applications_job_id_fkey";

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "created_by_admin",
DROP COLUMN "is_active",
ADD COLUMN     "category_ids" INTEGER[],
ADD COLUMN     "click_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "company_logo" TEXT,
ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "valid_from" TIMESTAMP(3),
ADD COLUMN     "valid_until" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
