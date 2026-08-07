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
    PostgrestVersion: '14.15'
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_allowlist: {
        Row: {
          club_id: string
          created_at: string
          email: string
        }
        Insert: {
          club_id: string
          created_at?: string
          email: string
        }
        Update: {
          club_id?: string
          created_at?: string
          email?: string
        }
        Relationships: [
          {
            foreignKeyName: 'admin_allowlist_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      admins: {
        Row: {
          club_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'admins_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number
          club_id: string
          id: string
          logged_by: string | null
          member_id: string
          occurred_at: string
        }
        Insert: {
          amount: number
          club_id: string
          id?: string
          logged_by?: string | null
          member_id: string
          occurred_at?: string
        }
        Update: {
          amount?: number
          club_id?: string
          id?: string
          logged_by?: string | null
          member_id?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contributions_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contributions_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          club_id: string
          description: string
          id: string
          logged_by: string | null
          occurred_at: string
        }
        Insert: {
          amount: number
          club_id: string
          description: string
          id?: string
          logged_by?: string | null
          occurred_at?: string
        }
        Update: {
          amount?: number
          club_id?: string
          description?: string
          id?: string
          logged_by?: string | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expenses_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      holdings: {
        Row: {
          barrels: number
          club_id: string
          holder_id: string
          id: string
          loose_shuttles: number
          product_id: string
          updated_at: string
        }
        Insert: {
          barrels?: number
          club_id: string
          holder_id: string
          id?: string
          loose_shuttles?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          barrels?: number
          club_id?: string
          holder_id?: string
          id?: string
          loose_shuttles?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'holdings_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'holdings_holder_id_fkey'
            columns: ['holder_id']
            isOneToOne: false
            referencedRelation: 'player_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'holdings_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_log: {
        Row: {
          action: string
          actor_name: string | null
          actor_user_id: string | null
          barrels_after: number
          barrels_delta: number
          club_id: string
          holder_id: string | null
          holder_name: string
          id: string
          loose_after: number
          loose_delta: number
          note: string | null
          occurred_at: string
          product_id: string | null
          product_label: string
        }
        Insert: {
          action: string
          actor_name?: string | null
          actor_user_id?: string | null
          barrels_after: number
          barrels_delta?: number
          club_id: string
          holder_id?: string | null
          holder_name: string
          id?: string
          loose_after: number
          loose_delta?: number
          note?: string | null
          occurred_at?: string
          product_id?: string | null
          product_label: string
        }
        Update: {
          action?: string
          actor_name?: string | null
          actor_user_id?: string | null
          barrels_after?: number
          barrels_delta?: number
          club_id?: string
          holder_id?: string | null
          holder_name?: string
          id?: string
          loose_after?: number
          loose_delta?: number
          note?: string | null
          occurred_at?: string
          product_id?: string | null
          product_label?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_log_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_log_holder_id_fkey'
            columns: ['holder_id']
            isOneToOne: false
            referencedRelation: 'player_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_log_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      match_results: {
        Row: {
          club_id: string
          court: number
          created_at: string
          id: string
          round: number
          score_a: number | null
          score_b: number | null
          session_id: string
          team_a_id: string | null
          team_b_id: string | null
          team_a1: string | null
          team_a2: string | null
          team_b1: string | null
          team_b2: string | null
          winner: string | null
        }
        Insert: {
          club_id: string
          court: number
          created_at?: string
          id?: string
          round: number
          score_a?: number | null
          score_b?: number | null
          session_id: string
          team_a_id?: string | null
          team_b_id?: string | null
          team_a1?: string | null
          team_a2?: string | null
          team_b1?: string | null
          team_b2?: string | null
          winner?: string | null
        }
        Update: {
          club_id?: string
          court?: number
          created_at?: string
          id?: string
          round?: number
          score_a?: number | null
          score_b?: number | null
          session_id?: string
          team_a_id?: string | null
          team_b_id?: string | null
          team_a1?: string | null
          team_a2?: string | null
          team_b1?: string | null
          team_b2?: string | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'match_results_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_results_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'match_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_results_team_a1_fkey'
            columns: ['team_a1']
            isOneToOne: false
            referencedRelation: 'player_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_results_team_a2_fkey'
            columns: ['team_a2']
            isOneToOne: false
            referencedRelation: 'player_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_results_team_b1_fkey'
            columns: ['team_b1']
            isOneToOne: false
            referencedRelation: 'player_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'match_results_team_b2_fkey'
            columns: ['team_b2']
            isOneToOne: false
            referencedRelation: 'player_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      tournament_teams: {
        Row: {
          id: string
          club_id: string
          session_id: string
          player1_id: string
          player2_id: string
          created_at: string
        }
        Insert: {
          id?: string
          club_id: string
          session_id: string
          player1_id: string
          player2_id: string
          created_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          session_id?: string
          player1_id?: string
          player2_id?: string
          created_at?: string
        }
        Relationships: []
      }
      match_sessions: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          hidden: boolean
          id: string
          kind: string
          mode: string
          played_at: string
          rounds: number
          status: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          hidden?: boolean
          id?: string
          kind?: string
          mode?: string
          played_at?: string
          rounds: number
          status?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          hidden?: boolean
          id?: string
          kind?: string
          mode?: string
          played_at?: string
          rounds?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'match_sessions_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      members: {
        Row: {
          club_id: string
          created_at: string
          email: string | null
          id: string
          name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
        }
        Update: {
          club_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'members_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      pair_ratings: {
        Row: {
          club_id: string
          games: number
          id: string
          player1_id: string
          player2_id: string
          rating: number
          rd: number
          updated_at: string
          volatility: number
        }
        Insert: {
          club_id: string
          games?: number
          id?: string
          player1_id: string
          player2_id: string
          rating?: number
          rd?: number
          updated_at?: string
          volatility?: number
        }
        Update: {
          club_id?: string
          games?: number
          id?: string
          player1_id?: string
          player2_id?: string
          rating?: number
          rd?: number
          updated_at?: string
          volatility?: number
        }
        Relationships: [
          {
            foreignKeyName: 'pair_ratings_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pair_ratings_player1_id_fkey'
            columns: ['player1_id']
            isOneToOne: false
            referencedRelation: 'player_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pair_ratings_player2_id_fkey'
            columns: ['player2_id']
            isOneToOne: false
            referencedRelation: 'player_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      player_profiles: {
        Row: {
          absent: boolean
          club_id: string
          created_at: string
          gender: string | null
          id: string
          is_matchmaker: boolean
          nickname: string
          skill: number | null
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          absent?: boolean
          club_id: string
          created_at?: string
          gender?: string | null
          id?: string
          is_matchmaker?: boolean
          nickname: string
          skill?: number | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          absent?: boolean
          club_id?: string
          created_at?: string
          gender?: string | null
          id?: string
          is_matchmaker?: boolean
          nickname?: string
          skill?: number | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'player_profiles_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      player_ratings: {
        Row: {
          club_id: string
          games: number
          player_id: string
          rating: number
          rd: number
          updated_at: string
          volatility: number
        }
        Insert: {
          club_id: string
          games?: number
          player_id: string
          rating?: number
          rd?: number
          updated_at?: string
          volatility?: number
        }
        Update: {
          club_id?: string
          games?: number
          player_id?: string
          rating?: number
          rd?: number
          updated_at?: string
          volatility?: number
        }
        Relationships: [
          {
            foreignKeyName: 'player_ratings_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'player_ratings_player_id_fkey'
            columns: ['player_id']
            isOneToOne: true
            referencedRelation: 'player_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          barrels: number
          brand: string
          club_id: string
          id: string
          loose_shuttles: number
          model: string
          shuttles_per_barrel: number
        }
        Insert: {
          barrels?: number
          brand: string
          club_id: string
          id?: string
          loose_shuttles?: number
          model: string
          shuttles_per_barrel?: number
        }
        Update: {
          barrels?: number
          brand?: string
          club_id?: string
          id?: string
          loose_shuttles?: number
          model?: string
          shuttles_per_barrel?: number
        }
        Relationships: [
          {
            foreignKeyName: 'products_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      purchases: {
        Row: {
          barrels: number
          club_id: string
          id: string
          logged_by: string | null
          note: string | null
          occurred_at: string
          price_per_barrel: number
          product_id: string
        }
        Insert: {
          barrels: number
          club_id: string
          id?: string
          logged_by?: string | null
          note?: string | null
          occurred_at?: string
          price_per_barrel: number
          product_id: string
        }
        Update: {
          barrels?: number
          club_id?: string
          id?: string
          logged_by?: string | null
          note?: string | null
          occurred_at?: string
          price_per_barrel?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'purchases_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchases_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      session_attendance: {
        Row: {
          club_id: string
          player_id: string
          present: boolean
          recorded_at: string
          session_id: string
        }
        Insert: {
          club_id: string
          player_id: string
          present: boolean
          recorded_at?: string
          session_id: string
        }
        Update: {
          club_id?: string
          player_id?: string
          present?: boolean
          recorded_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'session_attendance_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_attendance_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'player_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_attendance_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'match_sessions'
            referencedColumns: ['id']
          },
        ]
      }
      usage_entries: {
        Row: {
          club_id: string
          id: string
          logged_by: string | null
          occurred_at: string
          recorded_by: string | null
          session_id: string | null
        }
        Insert: {
          club_id: string
          id?: string
          logged_by?: string | null
          occurred_at?: string
          recorded_by?: string | null
          session_id?: string | null
        }
        Update: {
          club_id?: string
          id?: string
          logged_by?: string | null
          occurred_at?: string
          recorded_by?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'usage_entries_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usage_entries_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'match_sessions'
            referencedColumns: ['id']
          },
        ]
      }
      usage_items: {
        Row: {
          club_id: string
          holder_id: string | null
          product_id: string
          shuttles_used: number
          usage_id: string
        }
        Insert: {
          club_id: string
          holder_id?: string | null
          product_id: string
          shuttles_used: number
          usage_id: string
        }
        Update: {
          club_id?: string
          holder_id?: string | null
          product_id?: string
          shuttles_used?: number
          usage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usage_items_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usage_items_holder_id_fkey'
            columns: ['holder_id']
            isOneToOne: false
            referencedRelation: 'player_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usage_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usage_items_usage_id_fkey'
            columns: ['usage_id']
            isOneToOne: false
            referencedRelation: 'usage_entries'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { club: string }; Returns: boolean }
      is_matchmaker: { Args: { club: string }; Returns: boolean }
      delete_game_day: { Args: { p_session_id: string }; Returns: number }
      restore_usage_holdings: { Args: { p_usage_id: string }; Returns: number }
      substitute_team_player: {
        Args: {
          p_team_id: string
          p_out_player: string
          p_in_player: string
          p_from_round?: number
        }
        Returns: number
      }
      stock_actor_name: { Args: Record<string, never>; Returns: string }
      change_stock: {
        Args: {
          p_holder_id: string
          p_product_id: string
          p_barrels: number
          p_loose: number
          p_action: string
          p_note?: string
        }
        Returns: undefined
      }
      transfer_stock: {
        Args: {
          p_product_id: string
          p_from_id: string
          p_to_id: string
          p_barrels: number
          p_loose: number
          p_note?: string
        }
        Returns: undefined
      }
      delete_holding: {
        Args: { p_holder_id: string; p_product_id: string; p_note?: string }
        Returns: undefined
      }
      record_game_day_usage: {
        Args: { p_session_id: string; p_lines: Json; p_occurred_at?: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
