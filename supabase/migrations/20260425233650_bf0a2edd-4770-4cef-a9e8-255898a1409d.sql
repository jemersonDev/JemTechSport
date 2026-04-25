-- 1) Skill level enum
DO $$ BEGIN
  CREATE TYPE public.skill_level AS ENUM ('iniciante','casual','bom_de_bola','craque');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Extended player position enum (granular). Keep old 'goleiro'/'linha' working.
DO $$ BEGIN
  CREATE TYPE public.preferred_position_ext AS ENUM ('goleiro','zagueiro','meia','atacante');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Profiles new columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skill_level public.skill_level NOT NULL DEFAULT 'casual',
  ADD COLUMN IF NOT EXISTS preferred_position_ext public.preferred_position_ext NOT NULL DEFAULT 'meia';

-- 4) Jogadores manuais (jogadores adicionados pelo organizador, sem app)
CREATE TABLE IF NOT EXISTS public.jogadores_manuais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  racha_id uuid NOT NULL REFERENCES public.rachas(id) ON DELETE CASCADE,
  added_by uuid NOT NULL,
  name text NOT NULL,
  position public.preferred_position_ext NOT NULL DEFAULT 'meia',
  skill_level public.skill_level NOT NULL DEFAULT 'casual',
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jogadores_manuais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view manuais" ON public.jogadores_manuais;
CREATE POLICY "Members view manuais"
  ON public.jogadores_manuais FOR SELECT TO authenticated
  USING (public.is_racha_member(racha_id, auth.uid()));

DROP POLICY IF EXISTS "Admin insert manuais" ON public.jogadores_manuais;
CREATE POLICY "Admin insert manuais"
  ON public.jogadores_manuais FOR INSERT TO authenticated
  WITH CHECK (public.is_racha_admin(racha_id, auth.uid()) AND added_by = auth.uid());

DROP POLICY IF EXISTS "Admin update manuais" ON public.jogadores_manuais;
CREATE POLICY "Admin update manuais"
  ON public.jogadores_manuais FOR UPDATE TO authenticated
  USING (public.is_racha_admin(racha_id, auth.uid()));

DROP POLICY IF EXISTS "Admin delete manuais" ON public.jogadores_manuais;
CREATE POLICY "Admin delete manuais"
  ON public.jogadores_manuais FOR DELETE TO authenticated
  USING (public.is_racha_admin(racha_id, auth.uid()));

CREATE INDEX IF NOT EXISTS jogadores_manuais_racha_idx
  ON public.jogadores_manuais(racha_id);