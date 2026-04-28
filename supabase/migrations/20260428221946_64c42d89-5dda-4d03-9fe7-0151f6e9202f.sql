-- 1. Adicionar campos de placar em tempo real e estado da partida em rachas
ALTER TABLE public.rachas
  ADD COLUMN IF NOT EXISTS score_a integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_b integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match_started boolean NOT NULL DEFAULT false;

-- 2. Tabela de partidas finalizadas (resultado consolidado)
CREATE TABLE IF NOT EXISTS public.partidas_finalizadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  racha_id uuid NOT NULL,
  score_a integer NOT NULL DEFAULT 0,
  score_b integer NOT NULL DEFAULT 0,
  team_a_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  team_b_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  vencedor text,                 -- 'A' | 'B' | 'empate'
  mvp_user_id uuid,
  mvp_nome text,
  mvp_gols integer NOT NULL DEFAULT 0,
  mvp_assistencias integer NOT NULL DEFAULT 0,
  finalizada_em timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.partidas_finalizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem partidas finalizadas"
  ON public.partidas_finalizadas FOR SELECT
  TO authenticated
  USING (public.is_racha_member(racha_id, auth.uid()));

CREATE POLICY "Admin do racha cria partida finalizada"
  ON public.partidas_finalizadas FOR INSERT
  TO authenticated
  WITH CHECK (public.is_racha_admin(racha_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Admin do racha apaga partida finalizada"
  ON public.partidas_finalizadas FOR DELETE
  TO authenticated
  USING (public.is_racha_admin(racha_id, auth.uid()));

-- 3. Tabela de troféus / selos do jogador
CREATE TABLE IF NOT EXISTS public.trofeus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('mvp', 'fominha_mes', 'vitoria', 'craque_mes')),
  racha_id uuid,
  partida_id uuid,
  titulo text NOT NULL,
  descricao text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trofeus_user ON public.trofeus(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trofeus_tipo ON public.trofeus(tipo);

ALTER TABLE public.trofeus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trofeus visiveis a autenticados"
  ON public.trofeus FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin do racha concede trofeus"
  ON public.trofeus FOR INSERT
  TO authenticated
  WITH CHECK (
    racha_id IS NULL OR public.is_racha_admin(racha_id, auth.uid())
  );

CREATE POLICY "Admin do racha apaga trofeus"
  ON public.trofeus FOR DELETE
  TO authenticated
  USING (
    racha_id IS NULL OR public.is_racha_admin(racha_id, auth.uid())
  );

-- 4. Tabela de devedores (Lei do Cão)
CREATE TABLE IF NOT EXISTS public.devedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organizador_id uuid NOT NULL,
  racha_id uuid,
  motivo text,
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'devendo' CHECK (status IN ('devendo', 'pago')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organizador_id)
);

CREATE INDEX IF NOT EXISTS idx_devedores_user_status ON public.devedores(user_id, status);

ALTER TABLE public.devedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Devedor ve sua propria divida"
  ON public.devedores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR organizador_id = auth.uid());

CREATE POLICY "Organizador cria divida"
  ON public.devedores FOR INSERT
  TO authenticated
  WITH CHECK (organizador_id = auth.uid());

CREATE POLICY "Organizador atualiza divida"
  ON public.devedores FOR UPDATE
  TO authenticated
  USING (organizador_id = auth.uid());

CREATE POLICY "Organizador apaga divida"
  ON public.devedores FOR DELETE
  TO authenticated
  USING (organizador_id = auth.uid());

-- 5. Trigger: bloquear inscricao se jogador devendo ao admin do racha
CREATE OR REPLACE FUNCTION public.bloquear_inscricao_devedor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin uuid;
  _devendo boolean;
BEGIN
  SELECT admin_id INTO _admin FROM public.rachas WHERE id = NEW.racha_id;
  IF _admin IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.devedores
    WHERE user_id = NEW.user_id
      AND organizador_id = _admin
      AND status = 'devendo'
  ) INTO _devendo;

  IF _devendo THEN
    RAISE EXCEPTION 'Jogador esta marcado como devedor pelo organizador. Quite a divida para se inscrever.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_inscricao_devedor ON public.inscricoes;
CREATE TRIGGER trg_bloquear_inscricao_devedor
  BEFORE INSERT ON public.inscricoes
  FOR EACH ROW
  EXECUTE FUNCTION public.bloquear_inscricao_devedor();

-- 6. Realtime para placar e partidas
ALTER PUBLICATION supabase_realtime ADD TABLE public.partidas_finalizadas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trofeus;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devedores;

-- Garantir REPLICA IDENTITY FULL para receber dados completos no realtime
ALTER TABLE public.rachas REPLICA IDENTITY FULL;
ALTER TABLE public.partidas_finalizadas REPLICA IDENTITY FULL;
ALTER TABLE public.trofeus REPLICA IDENTITY FULL;
ALTER TABLE public.devedores REPLICA IDENTITY FULL;