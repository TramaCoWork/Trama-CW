INSERT INTO cron_jobs (id, key, name, schedule, active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'externalJobPostingsSync',
  'External Job Postings Sync',
  '0 3 * * 1',
  true,
  now(),
  now()
)
ON CONFLICT (key) DO NOTHING;
