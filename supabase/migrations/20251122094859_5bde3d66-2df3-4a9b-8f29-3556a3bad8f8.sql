-- Create revenue table to track monthly sales/income
CREATE TABLE public.revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month DATE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "All authenticated users can view revenue" 
ON public.revenue 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert revenue" 
ON public.revenue 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update revenue" 
ON public.revenue 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete revenue" 
ON public.revenue 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_revenue_updated_at
BEFORE UPDATE ON public.revenue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();