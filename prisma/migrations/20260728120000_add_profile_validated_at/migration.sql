-- AlterTable: marca de validacion del admin (proceso separado del pago)
ALTER TABLE "professional_profiles" ADD COLUMN "validated_at" TIMESTAMP(3);

-- Backfill: los perfiles hoy activos se consideran ya validados (grandfather),
-- para que no desaparezcan de los listados publicos al aplicar el nuevo gate.
UPDATE "professional_profiles"
SET "validated_at" = now()
WHERE "profile_status" = 'active' AND "deleted_at" IS NULL;
