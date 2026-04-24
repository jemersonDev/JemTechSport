-- ============== 1. ROLES (admin/moderador) ==============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'moderador');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  granted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','moderador')
  )
$$;

CREATE POLICY "Usuário vê próprias roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Super admin gerencia roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Admin pode ocultar/excluir posts e ver tudo
CREATE POLICY "Admin vê todos posts"
  ON public.resenha_posts FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin atualiza qualquer post"
  ON public.resenha_posts FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin deleta qualquer post"
  ON public.resenha_posts FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin vê todas denúncias"
  ON public.resenha_denuncias FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============== 2. STICKERS / OVERLAYS em posts ==============
ALTER TABLE public.resenha_posts
  ADD COLUMN IF NOT EXISTS overlays JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ============== 3. GEO em rachas ==============
ALTER TABLE public.rachas
  ADD COLUMN IF NOT EXISTS lat NUMERIC,
  ADD COLUMN IF NOT EXISTS lng NUMERIC,
  ADD COLUMN IF NOT EXISTS place_id TEXT;

-- ============== 4. PAGAMENTOS (Mercado Pago + saldo devedor) ==============
CREATE TYPE public.pagamento_status AS ENUM ('pendente','aprovado','recusado','reembolsado','cancelado');
CREATE TYPE public.pagamento_metodo AS ENUM ('pix_mp','dinheiro','outro');

CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  racha_id UUID NOT NULL,
  inscricao_id UUID,
  payer_user_id UUID NOT NULL,
  organizador_id UUID NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  valor_organizador NUMERIC(10,2) NOT NULL,
  valor_plataforma NUMERIC(10,2) NOT NULL,
  metodo public.pagamento_metodo NOT NULL DEFAULT 'pix_mp',
  status public.pagamento_status NOT NULL DEFAULT 'pendente',
  mp_payment_id TEXT,
  mp_preference_id TEXT,
  mp_qr_code TEXT,
  mp_qr_code_base64 TEXT,
  mp_ticket_url TEXT,
  raw JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagamentos_racha ON public.pagamentos(racha_id);
CREATE INDEX idx_pagamentos_payer ON public.pagamentos(payer_user_id);
CREATE INDEX idx_pagamentos_organizador ON public.pagamentos(organizador_id);
CREATE INDEX idx_pagamentos_mp_payment ON public.pagamentos(mp_payment_id);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pagador e organizador veem pagamento"
  ON public.pagamentos FOR SELECT TO authenticated
  USING (payer_user_id = auth.uid() OR organizador_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Pagador cria seu pagamento"
  ON public.pagamentos FOR INSERT TO authenticated
  WITH CHECK (payer_user_id = auth.uid());

CREATE POLICY "Organizador atualiza pagamento dinheiro"
  ON public.pagamentos FOR UPDATE TO authenticated
  USING (organizador_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_pagamentos_updated
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Saldo devedor por organizador (resumo agregado por mês)
CREATE TABLE public.organizador_saldo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizador_id UUID NOT NULL UNIQUE,
  total_devido_plataforma NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_recebido_plataforma NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizador_saldo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizador vê próprio saldo"
  ON public.organizador_saldo FOR SELECT TO authenticated
  USING (organizador_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admin gerencia saldo"
  ON public.organizador_saldo FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Atualiza saldo quando pagamento muda status
CREATE OR REPLACE FUNCTION public.pagamentos_saldo_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS DISTINCT FROM 'aprovado') THEN
    INSERT INTO public.organizador_saldo (organizador_id, total_devido_plataforma)
    VALUES (NEW.organizador_id, CASE WHEN NEW.metodo = 'dinheiro' THEN NEW.valor_plataforma ELSE 0 END)
    ON CONFLICT (organizador_id) DO UPDATE SET
      total_devido_plataforma = public.organizador_saldo.total_devido_plataforma
        + CASE WHEN NEW.metodo = 'dinheiro' THEN NEW.valor_plataforma ELSE 0 END,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pagamentos_saldo
  AFTER INSERT OR UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.pagamentos_saldo_trigger();

-- Conta MP do organizador (OAuth para split)
CREATE TABLE public.mp_contas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  mp_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  public_key TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mp_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê própria conta MP"
  ON public.mp_contas FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_mp_contas_updated
  BEFORE UPDATE ON public.mp_contas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();