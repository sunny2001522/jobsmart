-- Add Chinese translation field to job_applications table
-- This field stores the AI-translated Chinese summary of JD content for display purposes
-- The original English content remains in jd_content for resume generation

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS jd_content_zh JSONB;

COMMENT ON COLUMN public.job_applications.jd_content_zh IS 'Chinese translation/summary of JD content';
