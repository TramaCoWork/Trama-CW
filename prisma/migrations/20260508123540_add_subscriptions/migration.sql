-- CreateEnum
CREATE TYPE "FrequencyType" AS ENUM ('days', 'months', 'years');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'authorized', 'active', 'paused', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('sub_pending', 'sub_approved', 'sub_rejected', 'sub_refunded');

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "frequency_type" "FrequencyType" NOT NULL DEFAULT 'months',
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "external_id" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'pending',
    "start_date" TIMESTAMP(3),
    "trial_end_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "next_payment_date" TIMESTAMP(3),
    "mp_payer_email" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "external_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'sub_pending',
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_external_id_key" ON "subscriptions"("external_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_status" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_external_id_key" ON "subscription_payments"("external_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
