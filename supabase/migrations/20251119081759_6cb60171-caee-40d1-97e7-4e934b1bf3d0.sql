-- Make toy_id and sub_part_id nullable in production_logs
ALTER TABLE public.production_logs 
  ALTER COLUMN toy_id DROP NOT NULL,
  ALTER COLUMN sub_part_id DROP NOT NULL;