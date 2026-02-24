
-- Add care recipient details to care_requests
ALTER TABLE public.care_requests
  ADD COLUMN recipient_name TEXT DEFAULT '' NOT NULL,
  ADD COLUMN recipient_dob DATE,
  ADD COLUMN recipient_address TEXT DEFAULT '' NOT NULL,
  ADD COLUMN relationship_to_holder TEXT DEFAULT '' NOT NULL;
