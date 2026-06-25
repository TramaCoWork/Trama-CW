-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "discount_applied_at" TIMESTAMP(3),
ADD COLUMN     "discount_expires_at" TIMESTAMP(3),
ADD COLUMN     "discount_plan_id" TEXT,
ADD COLUMN     "discounted_amount" DECIMAL(10,2),
ADD COLUMN     "original_amount" DECIMAL(10,2);

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_discount_plan_id_fkey" FOREIGN KEY ("discount_plan_id") REFERENCES "discount_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
