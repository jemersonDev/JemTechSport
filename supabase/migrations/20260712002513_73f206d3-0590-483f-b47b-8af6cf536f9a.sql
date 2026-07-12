
ALTER TABLE public.resenha_posts
  ADD COLUMN IF NOT EXISTS music_url text,
  ADD COLUMN IF NOT EXISTS music_title text,
  ADD COLUMN IF NOT EXISTS music_artist text,
  ADD COLUMN IF NOT EXISTS music_cover text,
  ADD COLUMN IF NOT EXISTS music_start numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trim_start numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trim_end numeric;
