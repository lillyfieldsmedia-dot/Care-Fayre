
ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS cqc_explanation text DEFAULT '',
  ADD COLUMN IF NOT EXISTS years_in_operation integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
