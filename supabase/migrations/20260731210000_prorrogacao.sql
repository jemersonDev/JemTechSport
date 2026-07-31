-- Prorrogação: valor extra cobrado no meio/fim do jogo (ex: +30min de quadra)
ALTER TABLE public.rachas
  ADD COLUMN IF NOT EXISTS valor_extra NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.inscricoes
  ADD COLUMN IF NOT EXISTS paid_extra BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'principal';
