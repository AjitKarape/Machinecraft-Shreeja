-- Create trigger to automatically update toy stock when stock transactions change
CREATE TRIGGER update_toy_stock_trigger
AFTER INSERT OR UPDATE ON stock_transactions
FOR EACH ROW
EXECUTE FUNCTION update_toy_stock_after_transaction();