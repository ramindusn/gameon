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
    PostgrestVersion: '14.5'
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
      members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          club_id?: string
          created_at?: string
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
      player_profiles: {
        Row: {
          absent: boolean
          club_id: string
          created_at: string
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
      usage_entries: {
        Row: {
          club_id: string
          id: string
          logged_by: string | null
          occurred_at: string
        }
        Insert: {
          club_id: string
          id?: string
          logged_by?: string | null
          occurred_at?: string
        }
        Update: {
          club_id?: string
          id?: string
          logged_by?: string | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usage_entries_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          },
        ]
      }
      usage_items: {
        Row: {
          club_id: string
          product_id: string
          shuttles_used: number
          usage_id: string
        }
        Insert: {
          club_id: string
          product_id: string
          shuttles_used: number
          usage_id: string
        }
        Update: {
          club_id?: string
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
