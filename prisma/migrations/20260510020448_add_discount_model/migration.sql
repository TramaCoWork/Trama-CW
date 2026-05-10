-- CreateTable
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "percentage" DECIMAL(5,2),
    "fixed_amount" DECIMAL(10,2),
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "applied_at" TIMESTAMP(3),
    "restored" BOOLEAN NOT NULL DEFAULT false,
    "restored_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discounts_professional_dates" ON "discounts"("professional_id", "start_date", "end_date");

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
