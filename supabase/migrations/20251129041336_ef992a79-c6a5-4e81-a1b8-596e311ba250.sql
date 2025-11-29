-- Add opening_balance_date column to expense_mapping table
ALTER TABLE expense_mapping
ADD COLUMN opening_balance_date date DEFAULT '2024-04-01';

-- Add comment to explain the column
COMMENT ON COLUMN expense_mapping.opening_balance_date IS 'Date when the opening balance was recorded';