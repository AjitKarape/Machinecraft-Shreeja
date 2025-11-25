-- Drop the existing trigger
DROP TRIGGER IF EXISTS update_toy_stock_on_transaction ON public.stock_transactions;

-- Update the function to handle soft deletes (is_deleted flag changes)
CREATE OR REPLACE FUNCTION public.update_toy_stock_after_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Handle INSERT: Add stock from new transaction
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    UPDATE public.toys
    SET 
      current_stock = NEW.stock_after,
      last_transaction_at = NEW.created_at,
      updated_at = now()
    WHERE id = NEW.toy_id;
  END IF;
  
  -- Handle UPDATE: When transaction is marked as deleted, reverse the stock change
  IF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    UPDATE public.toys
    SET 
      current_stock = current_stock - NEW.quantity,
      updated_at = now()
    WHERE id = NEW.toy_id;
  END IF;
  
  -- Handle UPDATE: When transaction is undeleted, reapply the stock change
  IF TG_OP = 'UPDATE' AND OLD.is_deleted = true AND NEW.is_deleted = false THEN
    UPDATE public.toys
    SET 
      current_stock = current_stock + NEW.quantity,
      updated_at = now()
    WHERE id = NEW.toy_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger to handle both INSERT and UPDATE
CREATE TRIGGER update_toy_stock_on_transaction
  AFTER INSERT OR UPDATE ON public.stock_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_toy_stock_after_transaction();