-- AlterTable
ALTER TABLE "community_comments" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "deleted_at" TIMESTAMP(3);
