-- CreateIndex
CREATE INDEX "community_posts_channel_slug_deleted_at_status_created_at_idx" ON "community_posts"("channel_slug", "deleted_at", "status", "created_at");
