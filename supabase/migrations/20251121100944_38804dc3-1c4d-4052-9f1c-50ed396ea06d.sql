-- Add opening_balance column to sub_parts table
ALTER TABLE public.sub_parts 
ADD COLUMN opening_balance integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sub_parts.opening_balance IS 'Quantity of sub-part available before November 2025';