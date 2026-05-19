
-- ============ CONQUISTAS ============
CREATE TABLE public.conquistas (
  code text PRIMARY KEY,
  titulo text NOT NULL,
  descricao text NOT NULL,
  icone text NOT NULL DEFAULT 'trophy',
  raridade text NOT NULL DEFAULT 'comum',
  criterio jsonb NOT NULL DEFAULT '{}'::jsonb,
  ordem int NOT NULL DEFAULT 0
);
ALTER TABLE public.conquistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conquistas visiveis a todos" ON public.conquistas FOR SELECT TO authenticated USING (true);

INSERT INTO public.conquistas (code, titulo, descricao, icone, raridade, criterio, ordem) VALUES
('primeiro_racha', 'Estreante', 'Participou do primeiro racha', 'flag', 'comum', '{"partidas":1}', 1),
('dez_partidas', 'Veterano', 'Jogou 10 partidas', 'shield', 'comum', '{"partidas":10}', 2),
('cinquenta_partidas', 'Lenda Viva', 'Jogou 50 partidas', 'shield-check', 'epico', '{"partidas":50}', 3),
('cinco_mvps', 'Decisivo', 'Foi MVP em 5 partidas', 'crown', 'raro', '{"mvps":5}', 4),
('dez_vitorias', 'Vencedor', 'Venceu 10 partidas', 'trophy', 'comum', '{"vitorias":10}', 5),
('hat_trick', 'Hat-trick', 'Marcou 3+ gols numa partida', 'flame', 'raro', '{"hat_trick":true}', 6),
('invicto_3', 'Invicto', '3 vitórias seguidas', 'zap', 'raro', '{"streak_vitorias":3}', 7),
('artilheiro', 'Artilheiro', 'Marcou 25 gols no total', 'target', 'epico', '{"gols_total":25}', 8);

CREATE TABLE public.conquistas_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conquista_code text NOT NULL REFERENCES public.conquistas(code) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, conquista_code)
);
ALTER TABLE public.conquistas_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conquistas usuario visiveis a todos" ON public.conquistas_usuario FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sistema insere conquistas via funcao" ON public.conquistas_usuario FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.verificar_conquistas(_user_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _partidas int;
  _vitorias int;
  _mvps int;
  _gols_total int;
  _hat_trick boolean;
  _novas int := 0;
BEGIN
  SELECT COUNT(*) INTO _partidas FROM partidas_finalizadas
    WHERE _user_id::text = ANY(team_a_ids) OR _user_id::text = ANY(team_b_ids);
  SELECT COUNT(*) INTO _vitorias FROM partidas_finalizadas
    WHERE (vencedor='A' AND _user_id::text = ANY(team_a_ids))
       OR (vencedor='B' AND _user_id::text = ANY(team_b_ids));
  SELECT COUNT(*) INTO _mvps FROM partidas_finalizadas WHERE mvp_user_id = _user_id;
  SELECT COALESCE(SUM(gols),0) INTO _gols_total FROM gols_jogador WHERE user_id = _user_id;
  SELECT EXISTS(SELECT 1 FROM gols_jogador WHERE user_id=_user_id AND gols>=3) INTO _hat_trick;

  IF _partidas >= 1 THEN
    INSERT INTO conquistas_usuario(user_id,conquista_code) VALUES(_user_id,'primeiro_racha') ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _novas = ROW_COUNT;
  END IF;
  IF _partidas >= 10 THEN INSERT INTO conquistas_usuario(user_id,conquista_code) VALUES(_user_id,'dez_partidas') ON CONFLICT DO NOTHING; END IF;
  IF _partidas >= 50 THEN INSERT INTO conquistas_usuario(user_id,conquista_code) VALUES(_user_id,'cinquenta_partidas') ON CONFLICT DO NOTHING; END IF;
  IF _mvps >= 5 THEN INSERT INTO conquistas_usuario(user_id,conquista_code) VALUES(_user_id,'cinco_mvps') ON CONFLICT DO NOTHING; END IF;
  IF _vitorias >= 10 THEN INSERT INTO conquistas_usuario(user_id,conquista_code) VALUES(_user_id,'dez_vitorias') ON CONFLICT DO NOTHING; END IF;
  IF _hat_trick THEN INSERT INTO conquistas_usuario(user_id,conquista_code) VALUES(_user_id,'hat_trick') ON CONFLICT DO NOTHING; END IF;
  IF _gols_total >= 25 THEN INSERT INTO conquistas_usuario(user_id,conquista_code) VALUES(_user_id,'artilheiro') ON CONFLICT DO NOTHING; END IF;
  RETURN _novas;
END $$;

-- Trigger: ao finalizar partida, verifica conquistas dos participantes
CREATE OR REPLACE FUNCTION public.trg_verificar_conquistas_partida()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid text;
BEGIN
  FOREACH _uid IN ARRAY (NEW.team_a_ids || NEW.team_b_ids) LOOP
    BEGIN PERFORM verificar_conquistas(_uid::uuid); EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER on_partida_finalizada_conquistas
  AFTER INSERT ON public.partidas_finalizadas
  FOR EACH ROW EXECUTE FUNCTION public.trg_verificar_conquistas_partida();

-- ============ LISTA DE ESPERA ============
CREATE TABLE public.lista_espera (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  racha_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(racha_id, user_id)
);
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros veem fila" ON public.lista_espera FOR SELECT TO authenticated
  USING (is_racha_member(racha_id, auth.uid()));
CREATE POLICY "Usuario entra na fila" ON public.lista_espera FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_racha_member(racha_id, auth.uid()));
CREATE POLICY "Usuario sai da fila" ON public.lista_espera FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_racha_admin(racha_id, auth.uid()));

-- Trigger: promove 1º da fila quando sai inscrição
CREATE OR REPLACE FUNCTION public.trg_promover_fila()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _next record; _racha_name text; _max int; _atual int;
BEGIN
  SELECT name, max_players INTO _racha_name, _max FROM rachas WHERE id = OLD.racha_id;
  SELECT COUNT(*) INTO _atual FROM inscricoes WHERE racha_id = OLD.racha_id;
  IF _atual >= _max THEN RETURN OLD; END IF;
  SELECT * INTO _next FROM lista_espera WHERE racha_id = OLD.racha_id ORDER BY created_at LIMIT 1;
  IF _next IS NULL THEN RETURN OLD; END IF;
  INSERT INTO inscricoes(racha_id, user_id, position) VALUES(_next.racha_id, _next.user_id, 'linha')
    ON CONFLICT DO NOTHING;
  DELETE FROM lista_espera WHERE id = _next.id;
  INSERT INTO notificacoes(user_id, tipo, message, link)
    VALUES(_next.user_id, 'racha_join', '🎉 Vaga liberada em "'||COALESCE(_racha_name,'racha')||'"! Você foi promovido da fila.', '/rachas');
  RETURN OLD;
END $$;
CREATE TRIGGER on_inscricao_delete_promover
  AFTER DELETE ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_promover_fila();

-- ============ ESCALAÇÃO TÁTICA ============
ALTER TABLE public.rachas ADD COLUMN formacao text DEFAULT '4-3-3';
