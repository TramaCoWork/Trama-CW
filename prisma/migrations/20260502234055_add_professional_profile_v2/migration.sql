-- CreateEnum
CREATE TYPE "WorkModality" AS ENUM ('presencial', 'online', 'ambas');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('independiente', 'freelance', 'emprendedor', 'otro');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('secundario', 'terciario', 'universitario', 'posgrado', 'maestria', 'doctorado');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('dni', 'cv', 'title', 'certificate');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('pending_review', 'manual_approved', 'manual_rejected', 'ai_approved', 'ai_rejected');

-- CreateEnum
CREATE TYPE "ValidationType" AS ENUM ('manual', 'ai');

-- CreateEnum
CREATE TYPE "UsageFrequency" AS ENUM ('daily', 'three_four_weekly', 'occasional');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProfileStatus" ADD VALUE 'pending_review';
ALTER TYPE "ProfileStatus" ADD VALUE 'rejected';

-- AlterTable
ALTER TABLE "professional_profiles" ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "current_occupation" TEXT,
ADD COLUMN     "current_step" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "data_consent_accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dni" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "interests_in_trama" TEXT[],
ADD COLUMN     "is_first_time" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "main_profession" TEXT,
ADD COLUMN     "price_per_hour" DECIMAL(10,2),
ADD COLUMN     "space_types" TEXT[],
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trama_motivation" VARCHAR(300),
ADD COLUMN     "usage_frequency" "UsageFrequency",
ADD COLUMN     "work_modality" "WorkModality",
ADD COLUMN     "work_type" "WorkType",
ADD COLUMN     "work_type_other" TEXT,
ADD COLUMN     "years_experience" INTEGER;

-- CreateTable
CREATE TABLE "educations" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "level" "EducationLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "education_id" TEXT,
    "certification_id" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_validations" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "status" "ValidationStatus" NOT NULL,
    "validation_type" "ValidationType" NOT NULL,
    "reviewed_by" TEXT,
    "review_notes" TEXT,
    "documents_reviewed" TEXT[],
    "confidence_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profession_categories" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profession_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProfessionCategoryToProfessionalProfile" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProfessionCategoryToProfessionalProfile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "profession_categories_slug_key" ON "profession_categories"("slug");

-- CreateIndex
CREATE INDEX "_ProfessionCategoryToProfessionalProfile_B_index" ON "_ProfessionCategoryToProfessionalProfile"("B");

-- CreateIndex
CREATE INDEX "professionals_search" ON "professional_profiles"("city", "work_modality", "is_active");

-- CreateIndex
CREATE INDEX "professionals_profession" ON "professional_profiles"("main_profession", "is_active");

-- AddForeignKey
ALTER TABLE "educations" ADD CONSTRAINT "educations_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_education_id_fkey" FOREIGN KEY ("education_id") REFERENCES "educations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "certifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_validations" ADD CONSTRAINT "profile_validations_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_validations" ADD CONSTRAINT "profile_validations_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profession_categories" ADD CONSTRAINT "profession_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "profession_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessionCategoryToProfessionalProfile" ADD CONSTRAINT "_ProfessionCategoryToProfessionalProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "profession_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessionCategoryToProfessionalProfile" ADD CONSTRAINT "_ProfessionCategoryToProfessionalProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
