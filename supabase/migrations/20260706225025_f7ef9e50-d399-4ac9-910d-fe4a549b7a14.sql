
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS pushed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_notif_push_pending ON public.notificacoes (created_at) WHERE pushed_at IS NULL;
