
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_usage_log TO authenticated;
GRANT ALL ON public.ai_usage_log TO service_role;

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve seu proprio uso"
  ON public.ai_usage_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX ai_usage_log_user_created_idx
  ON public.ai_usage_log (user_id, created_at DESC);
