-- Create bank_transactions table for bank reconciliation
CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  expense_head TEXT,
  vendor TEXT,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for bank_transactions
CREATE POLICY "All authenticated users can view bank_transactions" 
ON public.bank_transactions 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert bank_transactions" 
ON public.bank_transactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update bank_transactions" 
ON public.bank_transactions 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete bank_transactions" 
ON public.bank_transactions 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bank_transactions_updated_at
BEFORE UPDATE ON public.bank_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.bank_transactions IS 'Stores bank statement transactions for reconciliation';