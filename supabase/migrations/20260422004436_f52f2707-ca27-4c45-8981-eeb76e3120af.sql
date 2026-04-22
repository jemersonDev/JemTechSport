-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.player_position AS ENUM ('goleiro', 'linha');
CREATE TYPE public.racha_role AS ENUM ('admin', 'jogador');
CREATE TYPE public.field_mode AS ENUM ('futsal', 'society', 'campo');

-- =========================================
-- HELPER: updated_at trigger
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================
-- HELPER: generate invite code
-- =========================================
CREATE OR REPLACE FUNCTION public.gen_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- =========================================
-- TABLE: profiles
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Jogador',
  avatar_url TEXT,
  preferred_position public.player_position NOT NULL DEFAULT 'linha',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- TABLE: rachas
-- =========================================
CREATE TABLE public.rachas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  scheduled_at TIMESTAMPTZ,
  total_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  app_fee NUMERIC(10,2) NOT NULL DEFAULT 0.20,
  max_players INT NOT NULL DEFAULT 12,
  field_mode public.field_mode NOT NULL DEFAULT 'society',
  pix_key TEXT,
  pix_key_type TEXT,
  pix_holder TEXT,
  invite_code TEXT NOT NULL UNIQUE DEFAULT public.gen_invite_code(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rachas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_rachas_updated_at
  BEFORE UPDATE ON public.rachas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- TABLE: racha_membros
-- =========================================
CREATE TABLE public.racha_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  racha_id UUID NOT NULL REFERENCES public.rachas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.racha_role NOT NULL DEFAULT 'jogador',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (racha_id, user_id)
);

ALTER TABLE public.racha_membros ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_racha_membros_user ON public.racha_membros(user_id);
CREATE INDEX idx_racha_membros_racha ON public.racha_membros(racha_id);

-- =========================================
-- HELPER: security definer functions to avoid RLS recursion
-- =========================================
CREATE OR REPLACE FUNCTION public.is_racha_member(_racha_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.racha_membros
    WHERE racha_id = _racha_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_racha_admin(_racha_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rachas
    WHERE id = _racha_id AND admin_id = _user_id
  );
$$;

-- =========================================
-- POLICIES: rachas
-- =========================================
CREATE POLICY "Members can view their rachas"
  ON public.rachas FOR SELECT
  TO authenticated
  USING (public.is_racha_member(id, auth.uid()) OR admin_id = auth.uid());

CREATE POLICY "Authenticated users can create rachas"
  ON public.rachas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admin can update racha"
  ON public.rachas FOR UPDATE
  TO authenticated
  USING (auth.uid() = admin_id);

CREATE POLICY "Admin can delete racha"
  ON public.rachas FOR DELETE
  TO authenticated
  USING (auth.uid() = admin_id);

-- Allow looking up racha by invite_code (needed for join flow)
CREATE POLICY "Anyone authenticated can lookup by invite code"
  ON public.rachas FOR SELECT
  TO authenticated
  USING (true);

-- =========================================
-- POLICIES: racha_membros
-- =========================================
CREATE POLICY "Members can view co-members"
  ON public.racha_membros FOR SELECT
  TO authenticated
  USING (public.is_racha_member(racha_id, auth.uid()));

CREATE POLICY "Users can join a racha as themselves"
  ON public.racha_membros FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave a racha"
  ON public.racha_membros FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_racha_admin(racha_id, auth.uid()));

-- =========================================
-- TABLE: inscricoes (presence in a specific racha)
-- =========================================
CREATE TABLE public.inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  racha_id UUID NOT NULL REFERENCES public.rachas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position public.player_position NOT NULL DEFAULT 'linha',
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (racha_id, user_id)
);

ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_inscricoes_racha ON public.inscricoes(racha_id);

CREATE POLICY "Members can view inscricoes"
  ON public.inscricoes FOR SELECT
  TO authenticated
  USING (public.is_racha_member(racha_id, auth.uid()));

CREATE POLICY "Members can sign themselves up"
  ON public.inscricoes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_racha_member(racha_id, auth.uid())
  );

CREATE POLICY "Players update own inscricao; admin can update any"
  ON public.inscricoes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_racha_admin(racha_id, auth.uid()));

CREATE POLICY "Players remove own inscricao; admin can remove any"
  ON public.inscricoes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_racha_admin(racha_id, auth.uid()));

CREATE TRIGGER set_inscricoes_updated_at
  BEFORE UPDATE ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- AUTO-CREATE PROFILE on signup
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'Jogador'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- AUTO-ADD admin as racha membro
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_racha()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.racha_membros (racha_id, user_id, role)
  VALUES (NEW.id, NEW.admin_id, 'admin')
  ON CONFLICT (racha_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_racha_created
  AFTER INSERT ON public.rachas
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_racha();

-- =========================================
-- STORAGE: avatars bucket
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );