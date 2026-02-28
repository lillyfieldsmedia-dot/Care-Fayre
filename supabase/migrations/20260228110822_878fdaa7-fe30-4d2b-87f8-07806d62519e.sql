
-- Add logo_url column to agency_profiles
ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT '';

-- Create agency-logos storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-logos', 'agency-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read logos
CREATE POLICY "Public read agency logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'agency-logos');

-- Allow agency users to upload their own logo
CREATE POLICY "Agency can upload own logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agency-logos'
  AND auth.uid() IS NOT NULL
);

-- Allow agency users to update their own logo
CREATE POLICY "Agency can update own logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'agency-logos'
  AND auth.uid() IS NOT NULL
);

-- Allow agency users to delete their own logo
CREATE POLICY "Agency can delete own logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'agency-logos'
  AND auth.uid() IS NOT NULL
);
