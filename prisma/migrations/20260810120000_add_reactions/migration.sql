-- CreateEnum
CREATE TYPE "ReactionTargetType" AS ENUM ('community_post', 'community_channel_post', 'community_comment', 'community_channel_comment');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD', 'DISLIKE');

-- CreateTable
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_type" "ReactionTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reactions_target_type_target_id_idx" ON "reactions"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_user_id_target_type_target_id_key" ON "reactions"("user_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
