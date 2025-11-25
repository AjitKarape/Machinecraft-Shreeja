-- Create expense_mapping table
CREATE TABLE public.expense_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_head TEXT NOT NULL,
  group_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_mapping ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view expense_mapping"
  ON public.expense_mapping
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert expense_mapping"
  ON public.expense_mapping
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update expense_mapping"
  ON public.expense_mapping
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete expense_mapping"
  ON public.expense_mapping
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_expense_mapping_updated_at
  BEFORE UPDATE ON public.expense_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();