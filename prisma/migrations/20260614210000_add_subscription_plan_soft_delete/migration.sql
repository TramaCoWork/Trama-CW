-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "subscription_plans_deleted_at" ON "subscription_plans"("deleted_at");
