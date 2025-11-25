-- Enable realtime for production_logs table
ALTER TABLE public.production_logs REPLICA IDENTITY FULL;

-- Ensure the table is in the realtime publication
-- (This will add it if not already present, or do nothing if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'production_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.production_logs;
  END IF;
END $$;