GRANT EXECUTE ON FUNCTION public.is_racha_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_racha_admin(uuid, uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';