-- Recalculate stock for all toys based on transactions
UPDATE toys
SET current_stock = COALESCE((
  SELECT SUM(quantity)
  FROM stock_transactions
  WHERE stock_transactions.toy_id = toys.id
    AND is_deleted = false
), 0),
updated_at = now();