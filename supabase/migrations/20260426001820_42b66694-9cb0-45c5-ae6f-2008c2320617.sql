-- Add bio to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;

-- Add views_count to resenha_posts
ALTER TABLE public.resenha_posts
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

-- Add assists to gols_jogador
ALTER TABLE public.gols_jogador
  ADD COLUMN IF NOT EXISTS assistencias integer NOT NULL DEFAULT 0;

-- Function to increment view count safely
CREATE OR REPLACE FUNCTION public.increment_post_view(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.resenha_posts
  SET views_count = views_count + 1
  WHERE id = _post_id;
END;
$$;