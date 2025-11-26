-- Phase 1: Fix all current stock values by recalculating from transactions
UPDATE toys
SET current_stock = COALESCE((
  SELECT SUM(
    CASE 
      WHEN transaction_type = 'production' THEN quantity
      WHEN transaction_type IN ('sale', 'sample') THEN -quantity
      ELSE 0
    END
  )
  FROM stock_transactions
  WHERE stock_transactions.toy_id = toys.id
    AND stock_transactions.is_deleted = false
), 0);

-- Phase 2: Drop all existing duplicate stock update triggers
DROP TRIGGER IF EXISTS trigger_update_toy_stock ON stock_transactions;
DROP TRIGGER IF EXISTS update_toy_stock_on_transaction ON stock_transactions;
DROP TRIGGER IF EXISTS update_toy_stock_trigger ON stock_transactions;

-- Drop the old function
DROP FUNCTION IF EXISTS update_toy_stock_after_transaction();

-- Create ONE new robust function that ALWAYS recalculates from transactions
CREATE OR REPLACE FUNCTION recalculate_toy_stock_from_transactions()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create ONE trigger that handles ALL operations (INSERT, UPDATE, DELETE)
CREATE TRIGGER recalculate_stock_on_transaction_change
AFTER INSERT OR UPDATE OR DELETE ON stock_transactions
FOR EACH ROW
EXECUTE FUNCTION recalculate_toy_stock_from_transactions();