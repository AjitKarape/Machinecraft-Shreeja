-- One-time fix: Sync current stock based on non-deleted transactions
UPDATE toys t
SET 
  current_stock = COALESCE((
    SELECT SUM(st.quantity)
    FROM stock_transactions st
    WHERE st.toy_id = t.id 
    AND st.is_deleted = false
  ), 0),
  updated_at = now();