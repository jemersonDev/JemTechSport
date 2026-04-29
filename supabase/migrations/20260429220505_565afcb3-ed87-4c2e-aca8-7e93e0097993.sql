ALTER TABLE public.rachas
  ADD COLUMN IF NOT EXISTS match_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS match_paused_elapsed_ms bigint NOT NULL DEFAULT 0;