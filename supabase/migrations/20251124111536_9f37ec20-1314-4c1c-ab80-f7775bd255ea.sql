-- Update stock_counts table to track toys instead of sub-parts

-- First, drop the old table and recreate with toy_id
DROP TABLE IF EXISTS public.stock_counts CASCADE;

CREATE TABLE public.stock_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  toy_id UUID NOT NULL,
  date DATE NOT NULL,
  opening_balance INTEGER NOT NULL DEFAULT 0,
  produced_quantity INTEGER NOT NULL DEFAULT 0,
  closing_balance INTEGER GENERATED ALWAYS AS (opening_balance + produced_quantity) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(toy_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view stock_counts" 
ON public.stock_counts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert stock_counts" 
ON public.stock_counts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stock_counts" 
ON public.stock_counts 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete stock_counts" 
ON public.stock_counts 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stock_counts_updated_at
BEFORE UPDATE ON public.stock_counts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_counts;