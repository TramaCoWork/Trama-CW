/*
  Warnings:

  - You are about to drop the column `price_max` on the `professional_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `price_min` on the `professional_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "professional_profiles" DROP COLUMN "price_max",
DROP COLUMN "price_min";
