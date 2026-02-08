-- Add PTT as a valid review source
-- This migration updates the company_reviews source constraint to include 'ptt'

-- Drop existing constraint if exists
ALTER TABLE public.company_reviews
DROP CONSTRAINT IF EXISTS company_reviews_source_check;

-- Add updated constraint with PTT
ALTER TABLE public.company_reviews
ADD CONSTRAINT company_reviews_source_check
CHECK (source IN ('dcard', 'medium', 'qollie', 'ptt', 'manual'));

-- Add index for source-based queries (if not exists)
CREATE INDEX IF NOT EXISTS company_reviews_source_idx
ON public.company_reviews(source);

-- Add index for faster company name lookups
CREATE INDEX IF NOT EXISTS company_reviews_company_id_source_idx
ON public.company_reviews(company_id, source);
