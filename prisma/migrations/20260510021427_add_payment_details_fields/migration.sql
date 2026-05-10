-- AlterTable
ALTER TABLE "subscription_payments" ADD COLUMN     "card_last_four_digits" TEXT,
ADD COLUMN     "installments" INTEGER,
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "payment_method_id" TEXT,
ADD COLUMN     "status_detail" TEXT;
