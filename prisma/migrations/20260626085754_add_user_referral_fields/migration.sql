-- AlterTable: add referral fields to users
ALTER TABLE "users" ADD COLUMN "referral_code" TEXT;
ALTER TABLE "users" ADD COLUMN "referral_by_user_id" TEXT;

-- CreateIndex: unique referral_code
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- AddForeignKey: referral_by_user_id -> users.id
ALTER TABLE "users" ADD CONSTRAINT "users_referral_by_user_id_fkey"
  FOREIGN KEY ("referral_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;