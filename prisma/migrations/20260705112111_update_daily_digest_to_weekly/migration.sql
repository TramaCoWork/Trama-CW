-- Update dailyDigest cron job: change from daily to weekly (Wednesdays at 7am)
-- and rename from "Digest diario" to "Digest semanal"
UPDATE cron_jobs
SET
  schedule   = '0 7 * * 3',
  name       = 'Digest semanal de canales',
  updated_at = now()
WHERE key = 'dailyDigest';
