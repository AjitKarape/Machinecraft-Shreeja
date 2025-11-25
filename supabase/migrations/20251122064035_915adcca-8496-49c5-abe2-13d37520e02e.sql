-- Add remark column to bank_transactions table
ALTER TABLE public.bank_transactions
ADD COLUMN remark text;

-- Add comment to describe the column
COMMENT ON COLUMN public.bank_transactions.remark IS 'Additional remarks or notes for the transaction';