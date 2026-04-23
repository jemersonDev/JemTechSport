
-- Storage buckets para vídeos e thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('resenha-videos', 'resenha-videos', true, 52428800, ARRAY['video/mp4','video/quicktime','video/webm']),
  ('resenha-thumbs', 'resenha-thumbs', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Tabela de posts (vídeos)
CREATE TABLE public.resenha_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  thumb_url TEXT,
  caption TEXT,
  duration_seconds NUMERIC,
  region TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  reports_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resenha_posts_created ON public.resenha_posts (created_at DESC) WHERE is_hidden = false;
CREATE INDEX idx_resenha_posts_user ON public.resenha_posts (user_id, created_at DESC);

ALTER TABLE public.resenha_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts visíveis para autenticados"
  ON public.resenha_posts FOR SELECT TO authenticated
  USING (is_hidden = false OR user_id = auth.uid());

CREATE POLICY "Usuários criam próprios posts"
  ON public.resenha_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários editam próprios posts"
  ON public.resenha_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam próprios posts"
  ON public.resenha_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Curtidas
CREATE TABLE public.resenha_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.resenha_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX idx_resenha_likes_post ON public.resenha_likes (post_id);
CREATE INDEX idx_resenha_likes_user ON public.resenha_likes (user_id);

ALTER TABLE public.resenha_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes visíveis para autenticados"
  ON public.resenha_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários curtem como si"
  ON public.resenha_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários removem própria curtida"
  ON public.resenha_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Comentários
CREATE TABLE public.resenha_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.resenha_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resenha_comentarios_post ON public.resenha_comentarios (post_id, created_at DESC);

ALTER TABLE public.resenha_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comentários visíveis para autenticados"
  ON public.resenha_comentarios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários comentam como si"
  ON public.resenha_comentarios FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários deletam próprios comentários"
  ON public.resenha_comentarios FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Seguir
CREATE TABLE public.resenha_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  followed_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);

CREATE INDEX idx_resenha_follows_follower ON public.resenha_follows (follower_id);
CREATE INDEX idx_resenha_follows_followed ON public.resenha_follows (followed_id);

ALTER TABLE public.resenha_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows visíveis para autenticados"
  ON public.resenha_follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários seguem como si"
  ON public.resenha_follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Usuários deixam de seguir"
  ON public.resenha_follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- Denúncias
CREATE TABLE public.resenha_denuncias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.resenha_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.resenha_denuncias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê própria denúncia"
  ON public.resenha_denuncias FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários denunciam como si"
  ON public.resenha_denuncias FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Triggers de contador
CREATE OR REPLACE FUNCTION public.resenha_likes_count_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.resenha_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.resenha_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_resenha_likes_count
AFTER INSERT OR DELETE ON public.resenha_likes
FOR EACH ROW EXECUTE FUNCTION public.resenha_likes_count_trigger();

CREATE OR REPLACE FUNCTION public.resenha_comentarios_count_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.resenha_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.resenha_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_resenha_comentarios_count
AFTER INSERT OR DELETE ON public.resenha_comentarios
FOR EACH ROW EXECUTE FUNCTION public.resenha_comentarios_count_trigger();

CREATE OR REPLACE FUNCTION public.resenha_denuncias_count_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.resenha_posts 
  SET reports_count = reports_count + 1,
      is_hidden = CASE WHEN reports_count + 1 >= 5 THEN true ELSE is_hidden END
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_resenha_denuncias_count
AFTER INSERT ON public.resenha_denuncias
FOR EACH ROW EXECUTE FUNCTION public.resenha_denuncias_count_trigger();

CREATE TRIGGER trg_resenha_posts_updated_at
BEFORE UPDATE ON public.resenha_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies
CREATE POLICY "Vídeos públicos para visualização"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id IN ('resenha-videos','resenha-thumbs'));

CREATE POLICY "Usuários sobem próprios vídeos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('resenha-videos','resenha-thumbs') 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Usuários deletam próprios vídeos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('resenha-videos','resenha-thumbs') 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Realtime para comentários e likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.resenha_comentarios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resenha_likes;
