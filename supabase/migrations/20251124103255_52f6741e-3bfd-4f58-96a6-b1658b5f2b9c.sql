-- Create daily_notes table for simplified daily log
CREATE TABLE public.daily_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  worker_name TEXT NOT NULL,
  notes TEXT,
  is_leave BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on daily_notes
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_notes
CREATE POLICY "Authenticated users can view daily_notes"
  ON public.daily_notes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert daily_notes"
  ON public.daily_notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update daily_notes"
  ON public.daily_notes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete daily_notes"
  ON public.daily_notes FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at on daily_notes
CREATE TRIGGER update_daily_notes_updated_at
  BEFORE UPDATE ON public.daily_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index on date for faster queries
CREATE INDEX idx_daily_notes_date ON public.daily_notes(date);

-- Create stock_counts table for periodic inventory tracking
CREATE TABLE public.stock_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_part_id UUID NOT NULL REFERENCES public.sub_parts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  opening_balance INTEGER NOT NULL DEFAULT 0,
  produced_quantity INTEGER NOT NULL DEFAULT 0,
  closing_balance INTEGER GENERATED ALWAYS AS (opening_balance + produced_quantity) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sub_part_id, date)
);

-- Enable RLS on stock_counts
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_counts
CREATE POLICY "Authenticated users can view stock_counts"
  ON public.stock_counts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert stock_counts"
  ON public.stock_counts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stock_counts"
  ON public.stock_counts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete stock_counts"
  ON public.stock_counts FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at on stock_counts
CREATE TRIGGER update_stock_counts_updated_at
  BEFORE UPDATE ON public.stock_counts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index on sub_part_id and date for efficient queries
CREATE INDEX idx_stock_counts_sub_part_date ON public.stock_counts(sub_part_id, date);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_counts;