-- Drop the existing constraint
ALTER TABLE stock_transactions 
DROP CONSTRAINT IF EXISTS stock_transactions_transaction_type_check;

-- Add the new constraint that includes 'sale'
ALTER TABLE stock_transactions 
ADD CONSTRAINT stock_transactions_transaction_type_check 
CHECK (transaction_type IN ('production', 'sale', 'sample'));