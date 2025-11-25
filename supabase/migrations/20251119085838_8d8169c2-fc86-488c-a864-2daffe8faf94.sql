-- Add 'editor' role to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'editor';

-- Update RLS policy on profiles to allow admins to update user access
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));