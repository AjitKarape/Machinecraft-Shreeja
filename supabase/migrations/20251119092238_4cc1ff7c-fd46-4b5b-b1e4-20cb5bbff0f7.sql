-- Fix existing user account by creating profile and assigning admin role
-- This handles the case where the signup trigger didn't run for existing users

-- Insert profile for existing authenticated user (if not exists)
INSERT INTO public.profiles (user_id, name, email, is_active, last_login)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  email,
  true,
  last_sign_in_at
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.users.id
);

-- Assign admin role to all existing users (since they're the first users)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.users.id 
  AND user_roles.role = 'admin'
);
