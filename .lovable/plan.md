
# Plano: 5 melhorias (#2, #5, #3, #20, #15)

## #2 — Onboarding (4 telas)
- Novo componente `OnboardingTour.tsx` com 4 slides:
  1. "Monte seu card FIFA" → leva a `/perfil`
  2. "Entre num racha" → leva a `/rachas`
  3. "Vote no craque" → explica votação
  4. "Compartilhe sua resenha" → leva a `/resenha`
- Salva `onboarding_completed` no `localStorage` + coluna nova `profiles.onboarding_completed boolean`
- Mostra automaticamente no primeiro login (montado em `__root.tsx` ou `index.tsx`)
- Botões "Pular" e "Próximo/Começar"

## #5 — Histórico de partidas do jogador
- Nova seção em `/atleta/$userId` (e `/perfil`) usando `partidas_finalizadas`
- Lista das últimas 10 partidas com: data, racha, placar, time do jogador, vitória/derrota/empate, se foi MVP
- Componente `PlayerMatchHistory.tsx` que consulta `partidas_finalizadas` filtrando onde o `userId` está em `team_a_ids` ou `team_b_ids`
- Card visual estilo timeline com badge "✓ Venceu" / "✗ Perdeu" / "= Empate" + "🏆 MVP" quando aplicável

## #3 — Story viral pós-jogo com link /r/CODE
- Modificar `MatchStoryShare.tsx`:
  - Adicionar QR code (lib `qrcode`) no rodapé do story com link `https://[dominio]/r/{invite_code}`
  - Texto "Vem jogar comigo no próximo!" + código do racha visível
  - Buscar `invite_code` do racha via prop nova
- Adicionar botão "Convidar pra próxima" no story
- Atualizar `usePartida` ou rota da partida para passar `invite_code`

## #15 — Backup automático
- Server route `src/routes/api/public/hooks/daily-backup.ts`:
  - Exporta tabelas críticas (`profiles`, `rachas`, `partidas_finalizadas`, `pagamentos`, `trofeus`, `devedores`) em JSON
  - Salva em bucket `backups` (privado) com nome `backup-YYYY-MM-DD.json`
- Nova migração: cria bucket `backups` privado + cron job pg_cron diário às 03:00
- Política RLS: só super_admin lê

## #20 — Notificações WhatsApp (versão simples, sem API paga)
- Em vez de WhatsApp Business API (que exige conta verificada/pago), implementar **botão "Avisar grupo no WhatsApp"** no detalhe do racha:
  - Gera mensagem pronta com nome, data, local, link `/r/CODE`
  - Abre `https://wa.me/?text=...` (deep link universal)
- Adicionar campo opcional `rachas.whatsapp_group_link` (text) — se preenchido, mostra botão "Abrir grupo"
- Para automação real seria preciso UAZAPI/Z-API (pago). Vou deixar a estrutura pronta com server function `notifyWhatsAppGroup` documentada mas não conectada.

## Arquivos
**Criar:** `src/components/OnboardingTour.tsx`, `src/components/PlayerMatchHistory.tsx`, `src/routes/api/public/hooks/daily-backup.ts`, `src/components/WhatsAppRachaShare.tsx`
**Editar:** `src/routes/__root.tsx` (mount onboarding), `src/routes/perfil.tsx` + `src/routes/atleta.$userId.tsx` (histórico), `src/components/MatchStoryShare.tsx` (QR + invite_code), `src/routes/rachas.tsx` (botão WhatsApp)
**Migrações:** adicionar `profiles.onboarding_completed`, `rachas.whatsapp_group_link`, bucket `backups`, cron job

## Dependências
- `bun add qrcode @types/qrcode` para QR code do story

## Como vai funcionar (resumo final)
1. Novo usuário entra → vê tour de 4 telas explicando o app
2. Em qualquer perfil → seção "Últimas partidas" mostra histórico com vitórias e MVPs
3. Após finalizar racha → story automático tem QR code + link convite "Vem jogar comigo"
4. Banco faz backup diário automático em bucket privado às 03:00
5. Organizador clica "Compartilhar racha no WhatsApp" → abre conversa com mensagem pronta + link de convite

Posso prosseguir?
