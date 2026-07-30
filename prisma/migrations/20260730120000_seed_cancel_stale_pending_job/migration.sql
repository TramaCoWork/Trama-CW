-- Data migration: registrar el cron job de cancelacion de pendientes viejos
INSERT INTO cron_jobs (id, key, name, schedule, active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'cancelStalePendingSubscriptions',
  'Cancelar suscripciones pendientes sin pago (>2 dias)',
  '0 2 * * *',
  true,
  now(),
  now()
)
ON CONFLICT (key) DO UPDATE SET
  schedule = '0 2 * * *',
  updated_at = now();
