-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "channel_slug" TEXT NOT NULL DEFAULT 'general';

-- CreateIndex
CREATE INDEX "community_posts_channel_slug_idx" ON "community_posts"("channel_slug");
