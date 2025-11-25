-- Add is_revenue flag to expense_mapping table
ALTER TABLE public.expense_mapping 
ADD COLUMN is_revenue BOOLEAN NOT NULL DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN public.expense_mapping.is_revenue IS 'Flag to indicate if this expense head represents revenue/income';
