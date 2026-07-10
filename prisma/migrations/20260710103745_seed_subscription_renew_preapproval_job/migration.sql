-- Data migration: insert subscriptionRenewPreapproval cron job
INSERT INTO cron_jobs (id, key, name, schedule, active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'subscriptionRenewPreapproval',
  'Renovacion preapproval MP',
  '30 1 * * *',
  true,
  now(),
  now()
)
ON CONFLICT (key) DO UPDATE SET
  schedule = '30 1 * * *',
  updated_at = now();