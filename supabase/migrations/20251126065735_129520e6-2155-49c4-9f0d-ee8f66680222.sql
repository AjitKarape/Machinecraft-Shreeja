-- Add opening_balance column to expense_mapping table
ALTER TABLE expense_mapping
ADD COLUMN opening_balance numeric DEFAULT 0;