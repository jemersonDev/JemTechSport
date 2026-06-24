
-- 1. pagamentos: enforce status='pendente' on client INSERT
DROP POLICY IF EXISTS "Pagador cria seu pagamento" ON public.pagamentos;
CREATE POLICY "Pagador cria seu pagamento" ON public.pagamentos
  FOR INSERT TO authenticated
  WITH CHECK (payer_user_id = auth.uid() AND status = 'pendente');

-- 2. resenha_mensagens: only sender can update, and only their own messages
DROP POLICY IF EXISTS "Destinatário marca como lida" ON public.resenha_mensagens;
CREATE POLICY "Remetente edita propria mensagem" ON public.resenha_mensagens
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- 3. Revoke EXECUTE on SECURITY DEFINER functions from public roles,
--    then re-grant only for functions intentionally exposed as RPCs.
REVOKE EXECUTE ON FUNCTION public.premiar_fominha_mes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_racha_by_invite(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_racha() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_racha_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_invite_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_racha_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enviar_lembretes_3h() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resenha_likes_count_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resenha_comentarios_count_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pagamentos_saldo_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resenha_denuncias_count_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resenha_msg_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resenha_get_or_create_conversa(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resenha_votos_count_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_racha_join() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_post_view(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._notify(uuid, uuid, notif_tipo, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_promover_fila() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bloquear_inscricao_devedor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_followers_on_post() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_followers_on_racha_join() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verificar_conquistas(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_verificar_conquistas_partida() FROM PUBLIC, anon, authenticated;

-- Re-grant ONLY for functions intentionally exposed via supabase.rpc(...)
GRANT EXECUTE ON FUNCTION public.get_racha_by_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resenha_get_or_create_conversa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_post_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.premiar_fominha_mes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;
