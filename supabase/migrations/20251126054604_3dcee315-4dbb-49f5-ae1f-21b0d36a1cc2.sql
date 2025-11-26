-- Fix security warning: Update function with search_path (using CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION recalculate_toy_stock_from_transactions()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always recalculate stock from the sum of all non-deleted transactions
  UPDATE toys
  SET 
    current_stock = COALESCE((
      SELECT SUM(
        CASE 
          WHEN transaction_type = 'production' THEN quantity
          WHEN transaction_type IN ('sale', 'sample') THEN -quantity
          ELSE 0
        END
      )
      FROM stock_transactions
      WHERE toy_id = COALESCE(NEW.toy_id, OLD.toy_id)
        AND is_deleted = false
    ), 0),
    last_transaction_at = CASE 
      WHEN TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_deleted = true)
      THEN (
        SELECT MAX(created_at)
        FROM stock_transactions
        WHERE toy_id = COALESCE(NEW.toy_id, OLD.toy_id)
          AND is_deleted = false
      )
      ELSE COALESCE(NEW.created_at, now())
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.toy_id, OLD.toy_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;