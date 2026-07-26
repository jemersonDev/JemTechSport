-- ============== VAGAS DE GOLEIRO (não pagam, fora do rateio) ==============
-- max_players continua representando as vagas de LINHA (é sobre elas que o
-- valor do racha é rateado). vagas_goleiro é capacidade ADICIONAL, separada,
-- e essas vagas nunca entram no cálculo de pagamento.
ALTER TABLE public.rachas
  ADD COLUMN IF NOT EXISTS vagas_goleiro INT NOT NULL DEFAULT 2;

-- ============== SAQUES (organizador ou plataforma sacam o saldo via PIX) ==============
-- Fluxo de status:
--   aguardando_aprovacao -> (acima do teto de auto-aprovação) espera admin clicar "aprovar"
--   processando          -> dentro do teto (ou já aprovado), chamando a API do MP agora
--   pago                  -> PIX confirmado enviado
--   falhou                -> a chamada à API do MP deu erro (saldo NÃO é debitado)
--   rejeitado             -> admin rejeitou o pedido (saldo NÃO é debitado)
CREATE TYPE public.saque_status AS ENUM (
  'aguardando_aprovacao', 'processando', 'pago', 'falhou', 'rejeitado'
);

CREATE TABLE public.saques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizador_id UUID NOT NULL,
  is_plataforma BOOLEAN NOT NULL DEFAULT false,
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  pix_key TEXT NOT NULL,
  pix_key_type TEXT NOT NULL,
  destinatario_nome TEXT,
  status public.saque_status NOT NULL DEFAULT 'aguardando_aprovacao',
  notas TEXT,
  mp_transfer_id TEXT,
  raw JSONB,
  processado_por UUID,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saques_organizador ON public.saques(organizador_id);
CREATE INDEX idx_saques_status ON public.saques(status);

ALTER TABLE public.saques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizador vê próprios saques"
  ON public.saques FOR SELECT TO authenticated
  USING (organizador_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admin atualiza saques"
  ON public.saques FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_saques_updated
  BEFORE UPDATE ON public.saques
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Saldo disponível pra saque do ORGANIZADOR = valor_organizador de pagamentos
-- PIX aprovados (dinheiro já foi recebido na hora, não entra aqui) MENOS
-- saques já em andamento/pagos (evita saque duplicado do mesmo valor).
CREATE OR REPLACE FUNCTION public.get_saldo_disponivel_saque(_organizador_id UUID)
RETURNS NUMERIC
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((
      SELECT SUM(valor_organizador) FROM public.pagamentos
      WHERE organizador_id = _organizador_id
        AND status = 'aprovado'
        AND metodo = 'pix_mp'
    ), 0)
    -
    COALESCE((
      SELECT SUM(valor) FROM public.saques
      WHERE organizador_id = _organizador_id
        AND is_plataforma = false
        AND status IN ('aguardando_aprovacao', 'processando', 'pago')
    ), 0);
$$;

-- Saldo disponível da PLATAFORMA (dono do app) = soma de todas as taxas
-- (valor_plataforma) de pagamentos PIX aprovados, menos os saques da
-- plataforma já em andamento/pagos. Só deve ser chamada por admin — a
-- verificação de permissão é feita na camada da aplicação (server function).
CREATE OR REPLACE FUNCTION public.get_saldo_plataforma()
RETURNS NUMERIC
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((
      SELECT SUM(valor_plataforma) FROM public.pagamentos
      WHERE status = 'aprovado' AND metodo = 'pix_mp'
    ), 0)
    -
    COALESCE((
      SELECT SUM(valor) FROM public.saques
      WHERE is_plataforma = true
        AND status IN ('aguardando_aprovacao', 'processando', 'pago')
    ), 0);
$$;

-- Quantidade de organizadores distintos (que já criaram pelo menos 1 racha) —
-- pro painel do admin ver "quantos organizadores usam o app".
CREATE OR REPLACE FUNCTION public.contar_organizadores()
RETURNS INT
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(DISTINCT admin_id)::INT FROM public.rachas;
$$;
