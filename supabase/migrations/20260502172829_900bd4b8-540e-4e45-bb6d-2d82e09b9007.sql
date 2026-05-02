-- Craque/Bagre voting per finalized match
CREATE TABLE public.partida_votos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partida_id UUID NOT NULL REFERENCES public.partidas_finalizadas(id) ON DELETE CASCADE,
  racha_id UUID NOT NULL,
  voter_id UUID NOT NULL,
  craque_target TEXT,
  bagre_target TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partida_id, voter_id)
);

CREATE INDEX idx_partida_votos_partida ON public.partida_votos(partida_id);

ALTER TABLE public.partida_votos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem votos do racha"
ON public.partida_votos FOR SELECT TO authenticated
USING (public.is_racha_member(racha_id, auth.uid()));

CREATE POLICY "Membros votam como si"
ON public.partida_votos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = voter_id AND public.is_racha_member(racha_id, auth.uid()));

CREATE POLICY "Eleitor atualiza proprio voto"
ON public.partida_votos FOR UPDATE TO authenticated
USING (auth.uid() = voter_id);

CREATE POLICY "Eleitor remove proprio voto"
ON public.partida_votos FOR DELETE TO authenticated
USING (auth.uid() = voter_id);

CREATE TRIGGER partida_votos_set_updated_at
BEFORE UPDATE ON public.partida_votos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();