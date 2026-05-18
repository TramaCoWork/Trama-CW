/*
  Warnings:

  - You are about to drop the column `trial_end_date` on the `subscriptions` table. All the data in the column will be lost.

*/
-- AlterTable
-- Copy non-null trial_end_date from subscriptions to professional_profiles
UPDATE professional_profiles pp
SET trial_end_date = s.trial_end_date
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE u.id = pp.user_id
  AND s.trial_end_date IS NOT NULL
  AND pp.trial_end_date IS NULL;

ALTER TABLE "subscriptions" DROP COLUMN "trial_end_date";
