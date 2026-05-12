ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS favorite_team_id text,
ADD COLUMN IF NOT EXISTS favorite_team_name text,
ADD COLUMN IF NOT EXISTS favorite_team_badge_url text;