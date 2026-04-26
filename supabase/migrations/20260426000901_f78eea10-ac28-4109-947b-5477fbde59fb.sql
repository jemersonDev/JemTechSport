-- Coluna pra marcar racha como finalizado
ALTER TABLE public.rachas
  ADD COLUMN IF NOT EXISTS finalizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS lembrete_3h_enviado boolean NOT NULL DEFAULT false;

-- Tabela de gols por jogador
CREATE TABLE IF NOT EXISTS public.gols_jogador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  racha_id uuid NOT NULL,
  user_id uuid NOT NULL,
  gols integer NOT NULL DEFAULT 0 CHECK (gols >= 0 AND gols <= 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (racha_id, user_id)
);

ALTER TABLE public.gols_jogador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem gols do racha"
  ON public.gols_jogador FOR SELECT
  TO authenticated
  USING (public.is_racha_member(racha_id, auth.uid()));

CREATE POLICY "Jogador registra próprios gols"
  ON public.gols_jogador FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_racha_member(racha_id, auth.uid()));

CREATE POLICY "Jogador edita próprios gols"
  ON public.gols_jogador FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Jogador apaga próprios gols; admin pode"
  ON public.gols_jogador FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_racha_admin(racha_id, auth.uid()));

CREATE TRIGGER trg_gols_jogador_updated
  BEFORE UPDATE ON public.gols_jogador
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função pra buscar user_id por email (apenas super_admin)
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS TABLE (user_id uuid, email text, display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Apenas super_admin pode buscar usuários';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, p.display_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE lower(u.email) = lower(_email)
  LIMIT 1;
END;
$$;

-- Função pra notificar lembrete (chamada pelo cron)
CREATE OR REPLACE FUNCTION public.enviar_lembretes_3h()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _racha record;
  _membro record;
  _count integer := 0;
BEGIN
  FOR _racha IN
    SELECT id, name, scheduled_at
    FROM public.rachas
    WHERE scheduled_at IS NOT NULL
      AND scheduled_at BETWEEN now() + interval '2 hours 30 minutes'
                           AND now() + interval '3 hours 30 minutes'
      AND lembrete_3h_enviado = false
      AND finalizado_em IS NULL
  LOOP
    FOR _membro IN
      SELECT user_id FROM public.racha_membros WHERE racha_id = _racha.id
    LOOP
      INSERT INTO public.notificacoes (user_id, actor_id, tipo, message, link)
      VALUES (
        _membro.user_id,
        NULL,
        'racha_join',
        '⏰ Seu racha "' || _racha.name || '" começa em 3 horas!',
        '/rachas'
      );
      _count := _count + 1;
    END LOOP;

    UPDATE public.rachas SET lembrete_3h_enviado = true WHERE id = _racha.id;
  END LOOP;

  RETURN _count;
END;
$$;