
-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  customer_id UUID NOT NULL,
  agency_id UUID NOT NULL,
  agreement_text TEXT NOT NULL,
  customer_agreed_at TIMESTAMP WITH TIME ZONE,
  agency_agreed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Both job parties can view contracts
CREATE POLICY "Job parties can view contracts"
ON public.contracts FOR SELECT
USING (auth.uid() = customer_id OR auth.uid() = agency_id);

-- Customer can create contracts (when accepting a bid)
CREATE POLICY "Customer can create contracts"
ON public.contracts FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Both parties can update contracts (to record their agreement)
CREATE POLICY "Job parties can update contracts"
ON public.contracts FOR UPDATE
USING (auth.uid() = customer_id OR auth.uid() = agency_id);

-- Add 'pending' to job_status enum so jobs start as pending before both agree
-- Check if 'pending' already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'job_status')) THEN
    ALTER TYPE public.job_status ADD VALUE 'pending';
  END IF;
END$$;
