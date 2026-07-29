-- Agrega el valor 'company' al enum RoleType.
-- Debe ir en su PROPIA migracion (transaccion aparte) para poder usarse luego.
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'company';
