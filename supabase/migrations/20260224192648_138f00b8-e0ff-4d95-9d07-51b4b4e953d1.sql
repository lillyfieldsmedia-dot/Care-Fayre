
-- Create reviews table
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  customer_id uuid NOT NULL,
  agency_profile_id uuid NOT NULL REFERENCES public.agency_profiles(id),
  star_rating integer NOT NULL CHECK (star_rating >= 1 AND star_rating <= 5),
  comment text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view reviews (public profile page)
CREATE POLICY "Authenticated can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Only customers with an active/completed job with the agency can insert
CREATE POLICY "Customers can submit reviews for their jobs"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = reviews.job_id
        AND jobs.customer_id = auth.uid()
        AND jobs.agency_profile_id = reviews.agency_profile_id
        AND jobs.status IN ('active', 'completed')
    )
  );

-- One review per job per customer (unique constraint)
ALTER TABLE public.reviews ADD CONSTRAINT reviews_job_customer_unique UNIQUE (job_id, customer_id);
