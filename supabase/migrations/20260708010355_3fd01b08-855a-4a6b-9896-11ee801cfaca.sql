GRANT EXECUTE ON FUNCTION public.gen_invite_code() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gen_invite_code() TO PUBLIC;

NOTIFY pgrst, 'reload schema';