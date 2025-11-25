-- Create stock_transactions table for transaction-based inventory
CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  toy_id UUID NOT NULL REFERENCES public.toys(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('production', 'sold', 'sample', 'adjustment', 'return', 'damaged')),
  quantity INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  price NUMERIC,
  customer_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Add indexes for better query performance
CREATE INDEX idx_stock_transactions_toy_id ON public.stock_transactions(toy_id);
CREATE INDEX idx_stock_transactions_created_at ON public.stock_transactions(created_at DESC);
CREATE INDEX idx_stock_transactions_type ON public.stock_transactions(transaction_type);

-- Add new columns to toys table
ALTER TABLE public.toys 
ADD COLUMN IF NOT EXISTS current_stock INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on stock_transactions
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_transactions
CREATE POLICY "Authenticated users can view stock_transactions"
ON public.stock_transactions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert stock_transactions"
ON public.stock_transactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stock_transactions"
ON public.stock_transactions FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete stock_transactions"
ON public.stock_transactions FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create function to update toy stock after transaction
CREATE OR REPLACE FUNCTION update_toy_stock_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    UPDATE public.toys
    SET 
      current_stock = NEW.stock_after,
      last_transaction_at = NEW.created_at
    WHERE id = NEW.toy_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update toy stock
CREATE TRIGGER trigger_update_toy_stock
AFTER INSERT ON public.stock_transactions
FOR EACH ROW
EXECUTE FUNCTION update_toy_stock_after_transaction();

-- Add realtime for stock_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_transactions;