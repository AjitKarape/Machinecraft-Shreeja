-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  account_number TEXT,
  account_type TEXT,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  last_statement_date DATE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bank_accounts
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bank_accounts
CREATE POLICY "All authenticated users can view bank_accounts"
ON public.bank_accounts
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert bank_accounts"
ON public.bank_accounts
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update bank_accounts"
ON public.bank_accounts
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete bank_accounts"
ON public.bank_accounts
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at on bank_accounts
CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Modify bank_transactions table
ALTER TABLE public.bank_transactions
ADD COLUMN bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
ADD COLUMN bank_name TEXT;

-- Pre-populate with the two banks
INSERT INTO public.bank_accounts (name, account_type, is_primary, is_active)
VALUES 
  ('ICICI Bank', 'Current', true, true),
  ('Janata Sahakari Bank', 'Savings', false, true);