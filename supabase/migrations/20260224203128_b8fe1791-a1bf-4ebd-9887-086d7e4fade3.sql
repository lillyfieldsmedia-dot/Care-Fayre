-- Add overnight care fields to care_requests
ALTER TABLE public.care_requests
  ADD COLUMN nights_per_week integer DEFAULT NULL,
  ADD COLUMN night_type text DEFAULT NULL;

-- Add overnight rate to bids
ALTER TABLE public.bids
  ADD COLUMN overnight_rate numeric DEFAULT NULL;