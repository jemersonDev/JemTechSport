
-- Função que premia o "Fominha do Mês": jogador com mais participações no mês.
-- SECURITY DEFINER pra contornar RLS de troféus (RLS exige admin de racha).
-- Idempotente por mês (não duplica troféu).
CREATE OR REPLACE FUNCTION public.premiar_fominha_mes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _start timestamptz := date_trunc('month', now());
  _end timestamptz := date_trunc('month', now()) + interval '1 month';
  _winner uuid;
  _count int;
  _nome text;
  _ja_existe boolean;
BEGIN
  -- Encontra o jogador com mais inscrições no mês corrente
  SELECT user_id, COUNT(*)::int
    INTO _winner, _count
  FROM public.inscricoes
  WHERE created_at >= _start AND created_at < _end
  GROUP BY user_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  IF _winner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sem_inscricoes');
  END IF;

  -- Já tem troféu fominha desse mês?
  SELECT EXISTS (
    SELECT 1 FROM public.trofeus
    WHERE tipo = 'fominha_mes'
      AND user_id = _winner
      AND created_at >= _start AND created_at < _end
  ) INTO _ja_existe;

  IF _ja_existe THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'user_id', _winner);
  END IF;

  SELECT display_name INTO _nome FROM public.profiles WHERE user_id = _winner;

  INSERT INTO public.trofeus (user_id, tipo, titulo, descricao, metadata)
  VALUES (
    _winner,
    'fominha_mes',
    'Fominha do Mês',
    _count || ' rachas em ' || to_char(now(), 'TMMonth/YYYY'),
    jsonb_build_object('participacoes', _count, 'mes', to_char(now(), 'YYYY-MM'))
  );

  RETURN jsonb_build_object('ok', true, 'user_id', _winner, 'nome', _nome, 'participacoes', _count);
END;
$$;
