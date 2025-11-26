-- Fix stock calculation: quantities already have correct sign
CREATE OR REPLACE FUNCTION recalculate_toy_stock_from_transactions()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simply SUM quantities - they already have correct signs
  -- Production: positive, Sale/Sample: negative
  UPDATE toys
  SET 
    current_stock = COALESCE((
      SELECT SUM(quantity)
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