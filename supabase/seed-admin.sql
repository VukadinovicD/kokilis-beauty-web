-- Run once, after creating the user in Authentication -> Users -> Add user.
-- The role lives in app_metadata, which only the service role can change, so nobody can grant it to themselves.

update auth.users
set
  raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb,
  raw_user_meta_data = raw_user_meta_data || '{"first_name": "Kristina", "last_name": "Petrovic"}'::jsonb
where email = 'kokiliiis10avgust@gmail.com';
