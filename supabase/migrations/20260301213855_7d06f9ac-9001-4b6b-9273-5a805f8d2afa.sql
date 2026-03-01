
-- Add query/dispute columns to timesheets
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS queried_at timestamptz,
  ADD COLUMN IF NOT EXISTS query_note text,
  ADD COLUMN IF NOT EXISTS query_response text,
  ADD COLUMN IF NOT EXISTS adjusted_hours numeric,
  ADD COLUMN IF NOT EXISTS response_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS query_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suggested_hours numeric;

-- Update default status from 'pending' to 'submitted' for new timesheets
ALTER TABLE public.timesheets ALTER COLUMN status SET DEFAULT 'submitted';

-- Update existing 'pending' timesheets to 'submitted'
UPDATE public.timesheets SET status = 'submitted' WHERE status = 'pending';
