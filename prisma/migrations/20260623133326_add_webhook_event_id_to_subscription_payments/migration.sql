-- AlterTable
ALTER TABLE "subscription_payments" ADD COLUMN     "webhook_event_id" TEXT;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_webhook_event_id_fkey" FOREIGN KEY ("webhook_event_id") REFERENCES "webhook_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
