-- Data migration: insert onboardingReminder cron job
INSERT INTO cron_jobs (id, key, name, schedule, active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'onboardingReminder',
  'Recordatorio de onboarding',
  '0 9 8 * *',
  true,
  now(),
  now()
)
ON CONFLICT (key) DO UPDATE SET
  schedule = '0 9 8 * *',
  updated_at = now();
