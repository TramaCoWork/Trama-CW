-- CreateTable
CREATE TABLE "channel_last_seen" (
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_last_seen_pkey" PRIMARY KEY ("user_id","channel_id")
);

-- CreateTable
CREATE TABLE "community_last_seen" (
    "user_id" TEXT NOT NULL,
    "channel_slug" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_last_seen_pkey" PRIMARY KEY ("user_id","channel_slug")
);

-- AddForeignKey
ALTER TABLE "channel_last_seen" ADD CONSTRAINT "channel_last_seen_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "community_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
