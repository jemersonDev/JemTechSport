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
      inscricoes: {
        Row: {
          created_at: string
          id: string
          paid: boolean
          paid_at: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          preferred_position: Database["public"]["Enums"]["player_position"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          preferred_position?: Database["public"]["Enums"]["player_position"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          preferred_position?: Database["public"]["Enums"]["player_position"]
          updated_at?: string
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
          id: string
          invite_code: string
          location: string | null
          max_players: number
          name: string
          pix_holder: string | null
          pix_key: string | null
          pix_key_type: string | null
          scheduled_at: string | null
          total_value: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_id: string
          app_fee?: number
          created_at?: string
          field_mode?: Database["public"]["Enums"]["field_mode"]
          id?: string
          invite_code?: string
          location?: string | null
          max_players?: number
          name: string
          pix_holder?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          scheduled_at?: string | null
          total_value?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_id?: string
          app_fee?: number
          created_at?: string
          field_mode?: Database["public"]["Enums"]["field_mode"]
          id?: string
          invite_code?: string
          location?: string | null
          max_players?: number
          name?: string
          pix_holder?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          scheduled_at?: string | null
          total_value?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_invite_code: { Args: never; Returns: string }
      is_racha_admin: {
        Args: { _racha_id: string; _user_id: string }
        Returns: boolean
      }
      is_racha_member: {
        Args: { _racha_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      field_mode: "futsal" | "society" | "campo"
      player_position: "goleiro" | "linha"
      racha_role: "admin" | "jogador"
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
      field_mode: ["futsal", "society", "campo"],
      player_position: ["goleiro", "linha"],
      racha_role: ["admin", "jogador"],
    },
  },
} as const
