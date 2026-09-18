-- Financial helpers: only trusted server code (service_role) may run these
REVOKE ALL ON FUNCTION public.get_saldo_disponivel_saque(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_saldo_plataforma() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_saldo_disponivel_saque(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_saldo_plataforma() TO service_role;

-- Remove blanket PUBLIC execute; keep only the roles that need it
REVOKE ALL ON FUNCTION public.contar_organizadores() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contar_organizadores() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_fellow_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_fellow_participant(uuid, uuid) TO authenticated, service_role;
