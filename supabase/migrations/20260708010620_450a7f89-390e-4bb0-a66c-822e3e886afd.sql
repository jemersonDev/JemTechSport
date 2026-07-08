REVOKE EXECUTE ON FUNCTION public.gen_invite_code() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.gen_invite_code() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';