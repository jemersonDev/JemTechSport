-- Índices para escalar com milhões de registros
CREATE INDEX IF NOT EXISTS idx_rachas_admin_id ON public.rachas(admin_id);
CREATE INDEX IF NOT EXISTS idx_rachas_scheduled_at ON public.rachas(scheduled_at) WHERE finalizado_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_rachas_invite_code ON public.rachas(invite_code);

CREATE INDEX IF NOT EXISTS idx_racha_membros_racha_id ON public.racha_membros(racha_id);
CREATE INDEX IF NOT EXISTS idx_racha_membros_user_id ON public.racha_membros(user_id);

CREATE INDEX IF NOT EXISTS idx_inscricoes_racha_id ON public.inscricoes(racha_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_user_id ON public.inscricoes(user_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_user_created ON public.inscricoes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pagamentos_organizador_status ON public.pagamentos(organizador_id, status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_payer_user ON public.pagamentos(payer_user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_inscricao ON public.pagamentos(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_mp_payment ON public.pagamentos(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_created_at ON public.pagamentos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gols_jogador_user ON public.gols_jogador(user_id);
CREATE INDEX IF NOT EXISTS idx_gols_jogador_racha ON public.gols_jogador(racha_id);

CREATE INDEX IF NOT EXISTS idx_partida_votos_racha ON public.partida_votos(racha_id);
CREATE INDEX IF NOT EXISTS idx_partida_votos_partida ON public.partida_votos(partida_id);
CREATE INDEX IF NOT EXISTS idx_partida_votos_craque ON public.partida_votos(craque_target);
CREATE INDEX IF NOT EXISTS idx_partida_votos_bagre ON public.partida_votos(bagre_target);

CREATE INDEX IF NOT EXISTS idx_partidas_finalizadas_racha ON public.partidas_finalizadas(racha_id);
CREATE INDEX IF NOT EXISTS idx_partidas_finalizadas_mvp ON public.partidas_finalizadas(mvp_user_id);

CREATE INDEX IF NOT EXISTS idx_trofeus_user_id ON public.trofeus(user_id);
CREATE INDEX IF NOT EXISTS idx_trofeus_user_tipo ON public.trofeus(user_id, tipo);

CREATE INDEX IF NOT EXISTS idx_notificacoes_user_read ON public.notificacoes(user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resenha_posts_user ON public.resenha_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resenha_posts_created ON public.resenha_posts(created_at DESC) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_resenha_likes_post ON public.resenha_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_resenha_likes_user ON public.resenha_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_resenha_comentarios_post ON public.resenha_comentarios(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resenha_follows_follower ON public.resenha_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_resenha_follows_followed ON public.resenha_follows(followed_id);

CREATE INDEX IF NOT EXISTS idx_devedores_user_status ON public.devedores(user_id, status);
CREATE INDEX IF NOT EXISTS idx_devedores_organizador ON public.devedores(organizador_id, status);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_jogadores_manuais_racha ON public.jogadores_manuais(racha_id);