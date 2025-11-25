-- Drop existing restrictive policies for toys
DROP POLICY IF EXISTS "Admins can insert toys" ON public.toys;
DROP POLICY IF EXISTS "Admins can update toys" ON public.toys;
DROP POLICY IF EXISTS "Admins can delete toys" ON public.toys;

-- Create new policies allowing all authenticated users
CREATE POLICY "Authenticated users can insert toys"
  ON public.toys FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update toys"
  ON public.toys FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete toys"
  ON public.toys FOR DELETE
  TO authenticated
  USING (true);

-- Drop existing restrictive policies for sub_parts
DROP POLICY IF EXISTS "Admins can insert sub_parts" ON public.sub_parts;
DROP POLICY IF EXISTS "Admins can update sub_parts" ON public.sub_parts;
DROP POLICY IF EXISTS "Admins can delete sub_parts" ON public.sub_parts;

-- Create new policies allowing all authenticated users
CREATE POLICY "Authenticated users can insert sub_parts"
  ON public.sub_parts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sub_parts"
  ON public.sub_parts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete sub_parts"
  ON public.sub_parts FOR DELETE
  TO authenticated
  USING (true);