-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('professional', 'company');

-- AlterTable: tipo de cuenta (backfill implicito por el DEFAULT en filas existentes)
ALTER TABLE "users" ADD COLUMN "account_type" "AccountType" NOT NULL DEFAULT 'professional';

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "rubro_id" INTEGER NOT NULL,
    "status" "ProfileStatus" NOT NULL DEFAULT 'pending_review',
    "validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_user_id_key" ON "companies"("user_id");
CREATE UNIQUE INDEX "companies_cuit_key" ON "companies"("cuit");
CREATE INDEX "companies_rubro_id_idx" ON "companies"("rubro_id");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "companies" ADD CONSTRAINT "companies_rubro_id_fkey" FOREIGN KEY ("rubro_id") REFERENCES "profession_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed del rol 'company' (idempotente)
INSERT INTO "roles" (id, name, type, created_at, updated_at)
VALUES (gen_random_uuid(), 'company', 'company', now(), now())
ON CONFLICT (name) DO NOTHING;
