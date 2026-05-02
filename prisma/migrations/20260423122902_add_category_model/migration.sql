/*
  Warnings:

  - You are about to drop the column `categories` on the `professional_profiles` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "professionals_category";

-- AlterTable
ALTER TABLE "professional_profiles" DROP COLUMN "categories";

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToProfessionalProfile" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryToProfessionalProfile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "_CategoryToProfessionalProfile_B_index" ON "_CategoryToProfessionalProfile"("B");

-- AddForeignKey
ALTER TABLE "_CategoryToProfessionalProfile" ADD CONSTRAINT "_CategoryToProfessionalProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProfessionalProfile" ADD CONSTRAINT "_CategoryToProfessionalProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
