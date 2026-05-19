Vou implementar 6 melhorias grandes em sequência. Por ser muita coisa, divido em fases priorizando o que dá mais impacto.

## Fase 1 — Banco (1 migração só)

Novas tabelas/colunas:
- `conquistas` (catálogo): `code`, `titulo`, `descricao`, `icone`, `criterio jsonb`
- `conquistas_usuario`: `user_id`, `conquista_code`, `unlocked_at` (unique)
- `lista_espera`: `racha_id`, `user_id`, `position int`, `created_at`
- `push_subscriptions`: `user_id`, `endpoint`, `p256dh`, `auth` (Web Push)
- `rachas`: nova coluna `formacao text` (ex: "4-3-3")
- Seed inicial de 8 conquistas (10 jogos, 5 MVPs, hat-trick, invicto-3, fominha, craque, primeiro racha, pagador-em-dia)
- Função `verificar_conquistas(user_id)` chamada após finalizar partida — concede troféus automáticos
- RLS em todas

## Fase 2 — Conquistas/Badges (#1)
- `src/components/ConquistasGrid.tsx` — grid 4-col com badges desbloqueadas/bloqueadas
- Integrar em `/perfil` e `/atleta/$userId`
- Toast animado "🏆 Nova conquista!" via realtime ao desbloquear
- Trigger SQL chama `verificar_conquistas` após insert em `partidas_finalizadas`

## Fase 3 — Lista de Espera (#3)
- Em `/rachas`, se racha cheio: botão "Entrar na fila" em vez de bloquear
- Componente `ListaEsperaCard` mostra posição na fila ("Você é o 2º")
- Trigger SQL: ao remover inscrição, promove o 1º da fila automaticamente + notificação push

## Fase 4 — Escalação Tática (#4)
- `src/components/EscalacaoTatica.tsx` — campo SVG com bolinhas posicionadas conforme formação
- Botão no sorteio: "Ver escalação 4-3-3 / 4-4-2 / 3-2-2"
- Posiciona automaticamente baseado em `preferred_position_ext` (goleiro/zagueiro/lateral/volante/meia/ataque)

## Fase 5 — Dashboard Organizador (#7)
- Nova aba em `/organizador`: "Dashboard"
- Cards: receita 30d, taxa presença, jogadores mais assíduos, devedores, gráfico de crescimento (recharts)
- Queries agregam `pagamentos`, `inscricoes`, `devedores`

## Fase 6 — Gráficos de Evolução (#9)
- `src/components/PlayerEvolutionChart.tsx` — line chart (recharts) em `/perfil` e `/atleta/$userId`
- Eixo X: últimas 10 partidas; Y: gols, vitórias acumuladas
- Usa `partidas_finalizadas` + `gols_jogador`

## Fase 7 — Push Notifications (#2)
- Service worker `public/sw.js` para receber push
- Server fn `subscribeToPush` salva subscription do usuário
- Server fn `sendPush(userId, msg)` usa lib `web-push` com VAPID
- Cron `pg_cron` chama endpoint `/api/public/hooks/push-lembretes` (3h antes do racha)
- Botão "Ativar notificações" no perfil
- **Requer**: gerar par de chaves VAPID e adicionar como secrets `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` (vou pedir após Fase 1-6)

## Como vai funcionar (resumo)
1. Jogador completa critério → badge desbloqueada → notificação no app
2. Racha cheio → entra na fila → quando alguém sai, próximo da fila é promovido
3. Após sorteio → vê escalação tática 4-3-3 no campo
4. Organizador vê dashboard com receita, presença, devedores
5. Perfil mostra gráfico de evolução das últimas partidas
6. (Push) Lembretes 3h antes chegam direto no celular

Posso prosseguir com todas as 7 fases?
