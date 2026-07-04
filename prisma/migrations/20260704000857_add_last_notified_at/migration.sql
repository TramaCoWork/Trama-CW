-- AlterTable
ALTER TABLE "channel_last_seen" ADD COLUMN     "last_notified_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "community_last_seen" ADD COLUMN     "last_notified_at" TIMESTAMP(3);
