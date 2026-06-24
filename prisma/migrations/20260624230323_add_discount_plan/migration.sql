-- CreateTable
CREATE TABLE "discount_plans" (
    "id" TEXT NOT NULL,
    "subscription_plan_id" TEXT NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "billing_cycles" INTEGER,
    "max_uses" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "per_user_limit" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discount_plans_active_dates" ON "discount_plans"("subscription_plan_id", "is_active", "from_date", "to_date");

-- CreateIndex
CREATE INDEX "discount_plans_deleted_at" ON "discount_plans"("deleted_at");

-- CreateIndex
CREATE INDEX "discount_plans_active_availability" ON "discount_plans"("is_active", "from_date", "to_date");

-- AddForeignKey
ALTER TABLE "discount_plans" ADD CONSTRAINT "discount_plans_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
