-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('published', 'paused');

-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "status" "PostStatus" NOT NULL DEFAULT 'published';
