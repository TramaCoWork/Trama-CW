-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "verification_notes" TEXT,
ADD COLUMN     "verification_status" "DocumentVerificationStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "verification_type" "ValidationType",
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by" TEXT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
