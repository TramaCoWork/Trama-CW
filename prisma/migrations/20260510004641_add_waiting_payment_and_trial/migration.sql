-- AlterEnum
ALTER TYPE "ProfileStatus" ADD VALUE 'waiting_payment';

-- AlterTable
ALTER TABLE "professional_profiles" ADD COLUMN     "trial_end_date" TIMESTAMP(3);
