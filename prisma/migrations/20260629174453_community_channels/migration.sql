-- CreateTable
CREATE TABLE "community_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_channel_members" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_channel_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_channel_posts" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "community_channel_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_channel_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "community_channel_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_channel_members_user_id_accepted_idx" ON "community_channel_members"("user_id", "accepted");

-- CreateIndex
CREATE UNIQUE INDEX "community_channel_members_channel_id_user_id_key" ON "community_channel_members"("channel_id", "user_id");

-- CreateIndex
CREATE INDEX "community_channel_posts_channel_id_deleted_at_created_at_idx" ON "community_channel_posts"("channel_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "community_channel_comments_post_id_deleted_at_created_at_idx" ON "community_channel_comments"("post_id", "deleted_at", "created_at");

-- AddForeignKey
ALTER TABLE "community_channel_members" ADD CONSTRAINT "community_channel_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "community_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_channel_posts" ADD CONSTRAINT "community_channel_posts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "community_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_channel_comments" ADD CONSTRAINT "community_channel_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_channel_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
