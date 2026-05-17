-- CreateEnum
CREATE TYPE "CommunityImageEntityType" AS ENUM ('POST', 'COMMENT', 'MESSAGE');

-- CreateTable
CREATE TABLE "community_images" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entityType" "CommunityImageEntityType",
    "entity_id" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_images_user" ON "community_images"("user_id");

-- CreateIndex
CREATE INDEX "community_images_entity" ON "community_images"("entityType", "entity_id");

-- AddForeignKey
ALTER TABLE "community_images" ADD CONSTRAINT "community_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
