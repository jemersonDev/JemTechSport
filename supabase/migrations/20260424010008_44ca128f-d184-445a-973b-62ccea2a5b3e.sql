-- DM: conversas e mensagens
CREATE TABLE IF NOT EXISTS public.resenha_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_order CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);

CREATE TABLE IF NOT EXISTS public.resenha_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.resenha_conversas(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msgs_conversa ON public.resenha_mensagens(conversa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversas_user_a ON public.resenha_conversas(user_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversas_user_b ON public.resenha_conversas(user_b, last_message_at DESC);

ALTER TABLE public.resenha_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resenha_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversas visíveis aos participantes"
  ON public.resenha_conversas FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Usuários criam conversas que participam"
  ON public.resenha_conversas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Participantes atualizam conversa"
  ON public.resenha_conversas FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Mensagens visíveis aos participantes"
  ON public.resenha_mensagens FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.resenha_conversas c
    WHERE c.id = conversa_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  ));

CREATE POLICY "Participantes enviam mensagens"
  ON public.resenha_mensagens FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.resenha_conversas c
      WHERE c.id = conversa_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

CREATE POLICY "Destinatário marca como lida"
  ON public.resenha_mensagens FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.resenha_conversas c
    WHERE c.id = conversa_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  ));

-- Trigger pra atualizar last_message
CREATE OR REPLACE FUNCTION public.resenha_msg_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.resenha_conversas
  SET last_message = NEW.content, last_message_at = NEW.created_at
  WHERE id = NEW.conversa_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_msg_after_insert
AFTER INSERT ON public.resenha_mensagens
FOR EACH ROW EXECUTE FUNCTION public.resenha_msg_after_insert();

-- Helper pra criar/buscar conversa
CREATE OR REPLACE FUNCTION public.resenha_get_or_create_conversa(_other_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _a uuid;
  _b uuid;
  _id uuid;
BEGIN
  IF _me IS NULL OR _me = _other_user THEN
    RAISE EXCEPTION 'invalid users';
  END IF;
  IF _me < _other_user THEN _a := _me; _b := _other_user;
  ELSE _a := _other_user; _b := _me; END IF;

  SELECT id INTO _id FROM public.resenha_conversas WHERE user_a = _a AND user_b = _b;
  IF _id IS NULL THEN
    INSERT INTO public.resenha_conversas (user_a, user_b) VALUES (_a, _b) RETURNING id INTO _id;
  END IF;
  RETURN _id;
END;
$$;

-- Bola Cheia / Murcha (votos semanais nos posts)
CREATE TYPE public.resenha_voto_tipo AS ENUM ('cheia', 'murcha');

CREATE TABLE IF NOT EXISTS public.resenha_votos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  voto public.resenha_voto_tipo NOT NULL,
  week_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_votos_week ON public.resenha_votos(week_start, voto);
CREATE INDEX IF NOT EXISTS idx_votos_post ON public.resenha_votos(post_id);

ALTER TABLE public.resenha_votos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votos visíveis para autenticados"
  ON public.resenha_votos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários votam como si"
  ON public.resenha_votos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários trocam próprio voto"
  ON public.resenha_votos FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários removem próprio voto"
  ON public.resenha_votos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Contadores no post
ALTER TABLE public.resenha_posts
  ADD COLUMN IF NOT EXISTS cheia_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS murcha_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.resenha_votos_count_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.voto = 'cheia' THEN
      UPDATE public.resenha_posts SET cheia_count = cheia_count + 1 WHERE id = NEW.post_id;
    ELSE
      UPDATE public.resenha_posts SET murcha_count = murcha_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.voto = 'cheia' THEN
      UPDATE public.resenha_posts SET cheia_count = GREATEST(cheia_count-1,0) WHERE id = OLD.post_id;
    ELSE
      UPDATE public.resenha_posts SET murcha_count = GREATEST(murcha_count-1,0) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.voto <> NEW.voto THEN
    IF NEW.voto = 'cheia' THEN
      UPDATE public.resenha_posts SET cheia_count = cheia_count+1, murcha_count = GREATEST(murcha_count-1,0) WHERE id = NEW.post_id;
    ELSE
      UPDATE public.resenha_posts SET murcha_count = murcha_count+1, cheia_count = GREATEST(cheia_count-1,0) WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_votos_count
AFTER INSERT OR UPDATE OR DELETE ON public.resenha_votos
FOR EACH ROW EXECUTE FUNCTION public.resenha_votos_count_trigger();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.resenha_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resenha_conversas;