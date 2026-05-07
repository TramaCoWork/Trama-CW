-- ============================================================================
-- Migration: profession_taxonomy_v2
-- Description: Restructure profession system to Rubro → Sub-rubro → Profesion
-- - Add level field to profession_categories
-- - Add rubro_id to professional_profiles
-- - Add profession_id to documents, educations, certifications
-- - Remove Category model and mainProfession field
-- ============================================================================

-- 1. Add level to profession_categories
ALTER TABLE "profession_categories" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;

-- 2. Populate level based on hierarchy depth
UPDATE "profession_categories" SET "level" = 1 WHERE "parent_id" IS NULL;
UPDATE "profession_categories" SET "level" = 2 WHERE "parent_id" IN (SELECT "id" FROM "profession_categories" WHERE "parent_id" IS NULL);
UPDATE "profession_categories" SET "level" = 3 WHERE "level" = 1 AND "parent_id" IS NOT NULL;

-- 3. Add rubro_id to professional_profiles
ALTER TABLE "professional_profiles" ADD COLUMN "rubro_id" INTEGER;

-- 4. Add profession_id to documents
ALTER TABLE "documents" ADD COLUMN "profession_id" INTEGER;

-- 5. Add profession_id to educations
ALTER TABLE "educations" ADD COLUMN "profession_id" INTEGER;

-- 6. Add profession_id to certifications
ALTER TABLE "certifications" ADD COLUMN "profession_id" INTEGER;

-- 7. Remove mainProfession column and its index
DROP INDEX IF EXISTS "professionals_profession";
ALTER TABLE "professional_profiles" DROP COLUMN IF EXISTS "main_profession";

-- 8. Drop Category model and its junction table
DROP TABLE IF EXISTS "_CategoryToProfessionalProfile";
DROP TABLE IF EXISTS "categories";

-- 9. Add foreign keys
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_rubro_id_fkey" FOREIGN KEY ("rubro_id") REFERENCES "profession_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "profession_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "educations" ADD CONSTRAINT "educations_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "profession_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "profession_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 10. Add index for rubro search
CREATE INDEX "professionals_rubro" ON "professional_profiles"("rubro_id", "is_active");
