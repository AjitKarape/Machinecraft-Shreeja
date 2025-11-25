-- Fix the incorrect stock_after value for the sale transaction
UPDATE stock_transactions 
SET stock_after = 159
WHERE toy_id = '8be41f36-727f-4b0c-86f6-e96d8eda2c78' 
  AND transaction_type = 'sale' 
  AND quantity = -10
  AND is_deleted = false
  AND stock_after = 160;

-- Update the toy's current stock to the correct value
UPDATE toys 
SET current_stock = 159, 
    updated_at = now()
WHERE id = '8be41f36-727f-4b0c-86f6-e96d8eda2c78';