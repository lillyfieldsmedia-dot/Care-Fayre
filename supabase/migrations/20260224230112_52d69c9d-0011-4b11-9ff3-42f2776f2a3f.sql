-- Add new status values to job_status enum
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'assessment_pending';
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'assessment_complete';
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'cancelled_pre_care';