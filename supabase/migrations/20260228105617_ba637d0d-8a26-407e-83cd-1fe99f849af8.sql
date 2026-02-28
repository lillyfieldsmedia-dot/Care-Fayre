
-- Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_contact_method text DEFAULT '';

-- Add new columns to agency_profiles table
ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS office_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS care_types_offered text[] DEFAULT '{}';
