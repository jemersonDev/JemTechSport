
-- 1. Rachas: tighten SELECT, add safe invite lookup
DROP POLICY IF EXISTS "Anyone authenticated can lookup by invite code" ON public.rachas;

CREATE OR REPLACE FUNCTION public.get_racha_by_invite(_code text)
RETURNS TABLE (
  id uuid,
  name text,
  scheduled_at timestamptz,
  location text,
  address text,
  max_players int,
  field_mode field_mode,
  invite_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.name, r.scheduled_at, r.location, r.address,
         r.max_players, r.field_mode, r.invite_code
  FROM public.rachas r
  WHERE r.invite_code = upper(_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_racha_by_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_racha_by_invite(text) TO authenticated;

-- 2. Trofeus: require platform admin for NULL racha_id
DROP POLICY IF EXISTS "Admin do racha concede trofeus" ON public.trofeus;
DROP POLICY IF EXISTS "Admin do racha apaga trofeus" ON public.trofeus;

CREATE POLICY "Trofeus insert por admin"
ON public.trofeus FOR INSERT TO authenticated
WITH CHECK (
  (racha_id IS NOT NULL AND public.is_racha_admin(racha_id, auth.uid()))
  OR (racha_id IS NULL AND public.is_admin(auth.uid()))
);

CREATE POLICY "Trofeus delete por admin"
ON public.trofeus FOR DELETE TO authenticated
USING (
  (racha_id IS NOT NULL AND public.is_racha_admin(racha_id, auth.uid()))
  OR (racha_id IS NULL AND public.is_admin(auth.uid()))
);

-- 3. Realtime: deny broadcast/presence by default; postgres_changes stays RLS-filtered
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- 4. Revoke anon EXECUTE on SECURITY DEFINER functions; restrict ones not meant for direct call
REVOKE EXECUTE ON FUNCTION public.premiar_fominha_mes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enviar_lembretes_3h() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verificar_conquistas(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._notify(uuid, uuid, notif_tipo, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_racha_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_racha_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resenha_get_or_create_conversa(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_post_view(uuid) FROM PUBLIC, anon;
