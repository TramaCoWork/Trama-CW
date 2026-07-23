-- AlterTable: marcador dedicado para el digest push (no toca last_seen_at ni last_notified_at)
ALTER TABLE "community_last_seen" ADD COLUMN "last_push_notified_at" TIMESTAMP(3);

-- Data migration: registrar el cron job del digest push (corre 10:00 hora server)
INSERT INTO cron_jobs (id, key, name, schedule, active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'communityDigestPush',
  'Digest push de community',
  '0 10 * * *',
  true,
  now(),
  now()
)
ON CONFLICT (key) DO UPDATE SET
  schedule = '0 10 * * *',
  updated_at = now();
