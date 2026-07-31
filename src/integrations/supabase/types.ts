export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage_log: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      conquistas: {
        Row: {
          code: string
          criterio: Json
          descricao: string
          icone: string
          ordem: number
          raridade: string
          titulo: string
        }
        Insert: {
          code: string
          criterio?: Json
          descricao: string
          icone?: string
          ordem?: number
          raridade?: string
          titulo: string
        }
        Update: {
          code?: string
          criterio?: Json
          descricao?: string
          icone?: string
          ordem?: number
          raridade?: string
          titulo?: string
        }
        Relationships: []
      }
      conquistas_usuario: {
        Row: {
          conquista_code: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          conquista_code: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          conquista_code?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conquistas_usuario_conquista_code_fkey"
            columns: ["conquista_code"]
            isOneToOne: false
            referencedRelation: "conquistas"
            referencedColumns: ["code"]
          },
        ]
      }
      devedores: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          organizador_id: string
          racha_id: string | null
          status: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          organizador_id: string
          racha_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          organizador_id?: string
          racha_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      gols_jogador: {
        Row: {
          assistencias: number
          created_at: string
          gols: number
          id: string
          racha_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assistencias?: number
          created_at?: string
          gols?: number
          id?: string
          racha_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assistencias?: number
          created_at?: string
          gols?: number
          id?: string
          racha_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inscricoes: {
        Row: {
          created_at: string
          id: string
          paid: boolean
          paid_at: string | null
          paid_extra: boolean
          position: Database["public"]["Enums"]["player_position"]
          racha_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          paid_extra?: boolean
          position?: Database["public"]["Enums"]["player_position"]
          racha_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          paid_extra?: boolean
          position?: Database["public"]["Enums"]["player_position"]
          racha_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_racha_id_fkey"
            columns: ["racha_id"]
            isOneToOne: false
            referencedRelation: "rachas"
            referencedColumns: ["id"]
          },
        ]
      }
      jogadores_manuais: {
        Row: {
          added_by: string
          created_at: string
          id: string
          name: string
          paid: boolean
          paid_at: string | null
          position: Database["public"]["Enums"]["preferred_position_ext"]
          racha_id: string
          skill_level: Database["public"]["Enums"]["skill_level"]
        }
        Insert: {
          added_by: string
          created_at?: string
          id?: string
          name: string
          paid?: boolean
          paid_at?: string | null
          position?: Database["public"]["Enums"]["preferred_position_ext"]
          racha_id: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
        }
        Update: {
          added_by?: string
          created_at?: string
          id?: string
          name?: string
          paid?: boolean
          paid_at?: string | null
          position?: Database["public"]["Enums"]["preferred_position_ext"]
          racha_id?: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
        }
        Relationships: [
          {
            foreignKeyName: "jogadores_manuais_racha_id_fkey"
            columns: ["racha_id"]
            isOneToOne: false
            referencedRelation: "rachas"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_espera: {
        Row: {
          created_at: string
          id: string
          racha_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          racha_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          racha_id?: string
          user_id?: string
        }
        Relationships: []
      }
      mp_contas: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: string
          mp_user_id: string | null
          public_key: string | null
          refresh_token: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          mp_user_id?: string | null
          public_key?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          mp_user_id?: string | null
          public_key?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          link: string | null
          message: string
          pushed_at: string | null
          read: boolean
          tipo: Database["public"]["Enums"]["notif_tipo"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message: string
          pushed_at?: string | null
          read?: boolean
          tipo: Database["public"]["Enums"]["notif_tipo"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          pushed_at?: string | null
          read?: boolean
          tipo?: Database["public"]["Enums"]["notif_tipo"]
          user_id?: string
        }
        Relationships: []
      }
      organizador_saldo: {
        Row: {
          id: string
          organizador_id: string
          total_devido_plataforma: number
          total_recebido_plataforma: number
          updated_at: string
        }
        Insert: {
          id?: string
          organizador_id: string
          total_devido_plataforma?: number
          total_recebido_plataforma?: number
          updated_at?: string
        }
        Update: {
          id?: string
          organizador_id?: string
          total_devido_plataforma?: number
          total_recebido_plataforma?: number
          updated_at?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          created_at: string
          id: string
          inscricao_id: string | null
          metodo: Database["public"]["Enums"]["pagamento_metodo"]
          mp_payment_id: string | null
          mp_preference_id: string | null
          mp_qr_code: string | null
          mp_qr_code_base64: string | null
          mp_ticket_url: string | null
          organizador_id: string
          paid_at: string | null
          payer_user_id: string
          racha_id: string
          raw: Json | null
          status: Database["public"]["Enums"]["pagamento_status"]
          tipo: string
          updated_at: string
          valor_organizador: number
          valor_plataforma: number
          valor_total: number
        }
        Insert: {
          created_at?: string
          id?: string
          inscricao_id?: string | null
          metodo?: Database["public"]["Enums"]["pagamento_metodo"]
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          organizador_id: string
          paid_at?: string | null
          payer_user_id: string
          racha_id: string
          raw?: Json | null
          status?: Database["public"]["Enums"]["pagamento_status"]
          tipo?: string
          updated_at?: string
          valor_organizador: number
          valor_plataforma: number
          valor_total: number
        }
        Update: {
          created_at?: string
          id?: string
          inscricao_id?: string | null
          metodo?: Database["public"]["Enums"]["pagamento_metodo"]
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          organizador_id?: string
          paid_at?: string | null
          payer_user_id?: string
          racha_id?: string
          raw?: Json | null
          status?: Database["public"]["Enums"]["pagamento_status"]
          tipo?: string
          updated_at?: string
          valor_organizador?: number
          valor_plataforma?: number
          valor_total?: number
        }
        Relationships: []
      }
      partida_votos: {
        Row: {
          bagre_target: string | null
          craque_target: string | null
          created_at: string
          id: string
          partida_id: string
          racha_id: string
          updated_at: string
          voter_id: string
        }
        Insert: {
          bagre_target?: string | null
          craque_target?: string | null
          created_at?: string
          id?: string
          partida_id: string
          racha_id: string
          updated_at?: string
          voter_id: string
        }
        Update: {
          bagre_target?: string | null
          craque_target?: string | null
          created_at?: string
          id?: string
          partida_id?: string
          racha_id?: string
          updated_at?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partida_votos_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas_finalizadas"
            referencedColumns: ["id"]
          },
        ]
      }
      partidas_finalizadas: {
        Row: {
          created_by: string
          finalizada_em: string
          id: string
          mvp_assistencias: number
          mvp_gols: number
          mvp_nome: string | null
          mvp_user_id: string | null
          racha_id: string
          score_a: number
          score_b: number
          team_a_ids: string[]
          team_b_ids: string[]
          vencedor: string | null
        }
        Insert: {
          created_by: string
          finalizada_em?: string
          id?: string
          mvp_assistencias?: number
          mvp_gols?: number
          mvp_nome?: string | null
          mvp_user_id?: string | null
          racha_id: string
          score_a?: number
          score_b?: number
          team_a_ids?: string[]
          team_b_ids?: string[]
          vencedor?: string | null
        }
        Update: {
          created_by?: string
          finalizada_em?: string
          id?: string
          mvp_assistencias?: number
          mvp_gols?: number
          mvp_nome?: string | null
          mvp_user_id?: string | null
          racha_id?: string
          score_a?: number
          score_b?: number
          team_a_ids?: string[]
          team_b_ids?: string[]
          vencedor?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          card_avatar_url: string | null
          created_at: string
          display_name: string
          favorite_team_badge_url: string | null
          favorite_team_id: string | null
          favorite_team_name: string | null
          id: string
          onboarding_completed: boolean
          preferred_position: Database["public"]["Enums"]["player_position"]
          preferred_position_ext: Database["public"]["Enums"]["preferred_position_ext"]
          skill_level: Database["public"]["Enums"]["skill_level"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          card_avatar_url?: string | null
          created_at?: string
          display_name?: string
          favorite_team_badge_url?: string | null
          favorite_team_id?: string | null
          favorite_team_name?: string | null
          id?: string
          onboarding_completed?: boolean
          preferred_position?: Database["public"]["Enums"]["player_position"]
          preferred_position_ext?: Database["public"]["Enums"]["preferred_position_ext"]
          skill_level?: Database["public"]["Enums"]["skill_level"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          card_avatar_url?: string | null
          created_at?: string
          display_name?: string
          favorite_team_badge_url?: string | null
          favorite_team_id?: string | null
          favorite_team_name?: string | null
          id?: string
          onboarding_completed?: boolean
          preferred_position?: Database["public"]["Enums"]["player_position"]
          preferred_position_ext?: Database["public"]["Enums"]["preferred_position_ext"]
          skill_level?: Database["public"]["Enums"]["skill_level"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      racha_membros: {
        Row: {
          id: string
          joined_at: string
          racha_id: string
          role: Database["public"]["Enums"]["racha_role"]
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          racha_id: string
          role?: Database["public"]["Enums"]["racha_role"]
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          racha_id?: string
          role?: Database["public"]["Enums"]["racha_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "racha_membros_racha_id_fkey"
            columns: ["racha_id"]
            isOneToOne: false
            referencedRelation: "rachas"
            referencedColumns: ["id"]
          },
        ]
      }
      rachas: {
        Row: {
          address: string | null
          admin_id: string
          app_fee: number
          created_at: string
          field_mode: Database["public"]["Enums"]["field_mode"]
          finalizado_em: string | null
          formacao: string | null
          id: string
          invite_code: string
          lat: number | null
          lembrete_3h_enviado: boolean
          lng: number | null
          location: string | null
          match_paused_elapsed_ms: number
          match_started: boolean
          match_started_at: string | null
          max_players: number
          name: string
          pix_holder: string | null
          pix_key: string | null
          pix_key_type: string | null
          place_id: string | null
          scheduled_at: string | null
          score_a: number
          score_b: number
          team_names: Json
          total_value: number
          updated_at: string
          vagas_goleiro: number
          valor_extra: number
          whatsapp_group_link: string | null
        }
        Insert: {
          address?: string | null
          admin_id: string
          app_fee?: number
          created_at?: string
          field_mode?: Database["public"]["Enums"]["field_mode"]
          finalizado_em?: string | null
          formacao?: string | null
          id?: string
          invite_code?: string
          lat?: number | null
          lembrete_3h_enviado?: boolean
          lng?: number | null
          location?: string | null
          match_paused_elapsed_ms?: number
          match_started?: boolean
          match_started_at?: string | null
          max_players?: number
          name: string
          pix_holder?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          place_id?: string | null
          scheduled_at?: string | null
          score_a?: number
          score_b?: number
          team_names?: Json
          total_value?: number
          updated_at?: string
          vagas_goleiro?: number
          valor_extra?: number
          whatsapp_group_link?: string | null
        }
        Update: {
          address?: string | null
          admin_id?: string
          app_fee?: number
          created_at?: string
          field_mode?: Database["public"]["Enums"]["field_mode"]
          finalizado_em?: string | null
          formacao?: string | null
          id?: string
          invite_code?: string
          lat?: number | null
          lembrete_3h_enviado?: boolean
          lng?: number | null
          location?: string | null
          match_paused_elapsed_ms?: number
          match_started?: boolean
          match_started_at?: string | null
          max_players?: number
          name?: string
          pix_holder?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          place_id?: string | null
          scheduled_at?: string | null
          score_a?: number
          score_b?: number
          team_names?: Json
          total_value?: number
          updated_at?: string
          vagas_goleiro?: number
          valor_extra?: number
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      resenha_comentarios: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resenha_comentarios_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "resenha_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      resenha_conversas: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      resenha_denuncias: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resenha_denuncias_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "resenha_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      resenha_follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      resenha_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resenha_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "resenha_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      resenha_mensagens: {
        Row: {
          content: string
          conversa_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversa_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversa_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resenha_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "resenha_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      resenha_posts: {
        Row: {
          caption: string | null
          cheia_count: number
          comments_count: number
          created_at: string
          duration_seconds: number | null
          id: string
          is_hidden: boolean
          likes_count: number
          murcha_count: number
          music_artist: string | null
          music_cover: string | null
          music_start: number | null
          music_title: string | null
          music_url: string | null
          overlays: Json
          region: string | null
          reports_count: number
          thumb_url: string | null
          trim_end: number | null
          trim_start: number | null
          updated_at: string
          user_id: string
          video_url: string
          views_count: number
        }
        Insert: {
          caption?: string | null
          cheia_count?: number
          comments_count?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_hidden?: boolean
          likes_count?: number
          murcha_count?: number
          music_artist?: string | null
          music_cover?: string | null
          music_start?: number | null
          music_title?: string | null
          music_url?: string | null
          overlays?: Json
          region?: string | null
          reports_count?: number
          thumb_url?: string | null
          trim_end?: number | null
          trim_start?: number | null
          updated_at?: string
          user_id: string
          video_url: string
          views_count?: number
        }
        Update: {
          caption?: string | null
          cheia_count?: number
          comments_count?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_hidden?: boolean
          likes_count?: number
          murcha_count?: number
          music_artist?: string | null
          music_cover?: string | null
          music_start?: number | null
          music_title?: string | null
          music_url?: string | null
          overlays?: Json
          region?: string | null
          reports_count?: number
          thumb_url?: string | null
          trim_end?: number | null
          trim_start?: number | null
          updated_at?: string
          user_id?: string
          video_url?: string
          views_count?: number
        }
        Relationships: []
      }
      resenha_votos: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          voto: Database["public"]["Enums"]["resenha_voto_tipo"]
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          voto: Database["public"]["Enums"]["resenha_voto_tipo"]
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          voto?: Database["public"]["Enums"]["resenha_voto_tipo"]
          week_start?: string
        }
        Relationships: []
      }
      trofeus: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          metadata: Json
          partida_id: string | null
          racha_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          metadata?: Json
          partida_id?: string | null
          racha_id?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          metadata?: Json
          partida_id?: string | null
          racha_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      saques: {
        Row: {
          created_at: string
          destinatario_nome: string | null
          id: string
          is_plataforma: boolean
          mp_transfer_id: string | null
          notas: string | null
          organizador_id: string
          paid_at: string | null
          pix_key: string
          pix_key_type: string
          processado_por: string | null
          raw: Json | null
          status: Database["public"]["Enums"]["saque_status"]
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          destinatario_nome?: string | null
          id?: string
          is_plataforma?: boolean
          mp_transfer_id?: string | null
          notas?: string | null
          organizador_id: string
          paid_at?: string | null
          pix_key: string
          pix_key_type: string
          processado_por?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["saque_status"]
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          destinatario_nome?: string | null
          id?: string
          is_plataforma?: boolean
          mp_transfer_id?: string | null
          notas?: string | null
          organizador_id?: string
          paid_at?: string | null
          pix_key?: string
          pix_key_type?: string
          processado_por?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["saque_status"]
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _notify: {
        Args: {
          _actor: string
          _link: string
          _msg: string
          _tipo: Database["public"]["Enums"]["notif_tipo"]
          _user: string
        }
        Returns: undefined
      }
      contar_organizadores: { Args: never; Returns: number }
      enviar_lembretes_3h: { Args: never; Returns: number }
      find_user_by_email: {
        Args: { _email: string }
        Returns: {
          display_name: string
          email: string
          user_id: string
        }[]
      }
      gen_invite_code: { Args: never; Returns: string }
      get_racha_by_invite: {
        Args: { _code: string }
        Returns: {
          address: string
          field_mode: Database["public"]["Enums"]["field_mode"]
          id: string
          invite_code: string
          location: string
          max_players: number
          name: string
          scheduled_at: string
        }[]
      }
      get_saldo_disponivel_saque: { Args: { _organizador_id: string }; Returns: number }
      get_saldo_plataforma: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_view: { Args: { _post_id: string }; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_racha_admin: {
        Args: { _racha_id: string; _user_id: string }
        Returns: boolean
      }
      is_racha_member: {
        Args: { _racha_id: string; _user_id: string }
        Returns: boolean
      }
      premiar_fominha_mes: { Args: never; Returns: Json }
      resenha_get_or_create_conversa: {
        Args: { _other_user: string }
        Returns: string
      }
      verificar_conquistas: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "super_admin" | "moderador"
      field_mode: "futsal" | "society" | "campo"
      notif_tipo:
        | "like"
        | "comment"
        | "follow"
        | "message"
        | "payment"
        | "racha_join"
      pagamento_metodo: "pix_mp" | "dinheiro" | "outro"
      pagamento_status:
        | "pendente"
        | "aprovado"
        | "recusado"
        | "reembolsado"
        | "cancelado"
      player_position: "goleiro" | "linha"
      preferred_position_ext: "goleiro" | "zagueiro" | "meia" | "atacante"
      racha_role: "admin" | "jogador"
      resenha_voto_tipo: "cheia" | "murcha"
      saque_status:
        | "aguardando_aprovacao"
        | "processando"
        | "pago"
        | "falhou"
        | "rejeitado"
      skill_level: "iniciante" | "casual" | "bom_de_bola" | "craque"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "moderador"],
      field_mode: ["futsal", "society", "campo"],
      notif_tipo: [
        "like",
        "comment",
        "follow",
        "message",
        "payment",
        "racha_join",
      ],
      pagamento_metodo: ["pix_mp", "dinheiro", "outro"],
      pagamento_status: [
        "pendente",
        "aprovado",
        "recusado",
        "reembolsado",
        "cancelado",
      ],
      player_position: ["goleiro", "linha"],
      preferred_position_ext: ["goleiro", "zagueiro", "meia", "atacante"],
      racha_role: ["admin", "jogador"],
      resenha_voto_tipo: ["cheia", "murcha"],
      saque_status: [
        "aguardando_aprovacao",
        "processando",
        "pago",
        "falhou",
        "rejeitado",
      ],
      skill_level: ["iniciante", "casual", "bom_de_bola", "craque"],
    },
  },
} as const
