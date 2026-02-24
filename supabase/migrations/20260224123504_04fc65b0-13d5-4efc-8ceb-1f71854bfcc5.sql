
-- Create timesheets table
CREATE TABLE public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  submitted_by uuid NOT NULL,
  week_starting date NOT NULL,
  hours_worked numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disputed')),
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job parties can view timesheets"
  ON public.timesheets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = timesheets.job_id
        AND (jobs.customer_id = auth.uid() OR jobs.agency_id = auth.uid())
    )
  );

CREATE POLICY "Agency can submit timesheets"
  ON public.timesheets FOR INSERT
  WITH CHECK (
    auth.uid() = submitted_by
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = timesheets.job_id AND jobs.agency_id = auth.uid()
    )
  );

CREATE POLICY "Job parties can update timesheets"
  ON public.timesheets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = timesheets.job_id
        AND (jobs.customer_id = auth.uid() OR jobs.agency_id = auth.uid())
    )
  );

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  timesheet_id uuid REFERENCES public.timesheets(id),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job parties can view payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = payments.job_id
        AND (jobs.customer_id = auth.uid() OR jobs.agency_id = auth.uid())
    )
  );

CREATE POLICY "System can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = payments.job_id
        AND (jobs.customer_id = auth.uid() OR jobs.agency_id = auth.uid())
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_timesheets_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
