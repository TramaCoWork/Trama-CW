-- Add publicId (SERIAL) to professional_profiles
-- SERIAL fills existing rows automatically with sequential numbers
ALTER TABLE professional_profiles ADD COLUMN public_id SERIAL;
ALTER TABLE professional_profiles ADD CONSTRAINT professional_profiles_public_id_key UNIQUE (public_id);