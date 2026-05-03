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
      impersonation_log: {
        Row: {
          ended_at: string | null
          id: string
          impersonated_id: string
          impersonator_id: string
          started_at: string
          workspace_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          impersonated_id: string
          impersonator_id: string
          started_at?: string
          workspace_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          impersonated_id?: string
          impersonator_id?: string
          started_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_log_impersonated_id_fkey"
            columns: ["impersonated_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_log_impersonator_id_fkey"
            columns: ["impersonator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      legatus_admins: {
        Row: {
          access_level: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          access_level?: string
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          access_level?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string
          duration_minutes: number | null
          follow_up_meeting_id: string | null
          id: string
          location: string | null
          notes: string | null
          parent_meeting_id: string | null
          person_id: string | null
          result: Json | null
          scheduled_at: string
          status: string
          type_key: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          follow_up_meeting_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          parent_meeting_id?: string | null
          person_id?: string | null
          result?: Json | null
          scheduled_at: string
          status?: string
          type_key: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          follow_up_meeting_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          parent_meeting_id?: string | null
          person_id?: string | null
          result?: Json | null
          scheduled_at?: string
          status?: string
          type_key?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_follow_up_meeting_id_fkey"
            columns: ["follow_up_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_parent_meeting_id_fkey"
            columns: ["parent_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          created_by: string
          full_name: string
          gdpr_consented_at: string | null
          id: string
          note: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          full_name: string
          gdpr_consented_at?: string | null
          id?: string
          note?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          full_name?: string
          gdpr_consented_at?: string | null
          id?: string
          note?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      production_units: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          value_multiplier: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          value_multiplier?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          value_multiplier?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_units_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          subscription: Json
          user_agent: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          subscription: Json
          user_agent?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          subscription?: Json
          user_agent?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          gdpr_consent_accepted_at: string | null
          gdpr_consent_version: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          role_key: string | null
          workspace_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          gdpr_consent_accepted_at?: string | null
          gdpr_consent_version?: string | null
          id: string
          is_active?: boolean
          manager_id?: string | null
          role_key?: string | null
          workspace_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          gdpr_consent_accepted_at?: string | null
          gdpr_consent_version?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          role_key?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_config: {
        Row: {
          created_at: string
          follow_up_rules: Json
          id: string
          impersonation: Json
          meeting_types: Json
          metrics: Json
          modules: Json
          promotion: Json
          ui_config: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          follow_up_rules?: Json
          id?: string
          impersonation?: Json
          meeting_types?: Json
          metrics?: Json
          modules?: Json
          promotion?: Json
          ui_config?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          follow_up_rules?: Json
          id?: string
          impersonation?: Json
          meeting_types?: Json
          metrics?: Json
          modules?: Json
          promotion?: Json
          ui_config?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_config_log: {
        Row: {
          change_type: string
          changed_by_admin_id: string | null
          created_at: string
          id: string
          new_value: Json | null
          note: string | null
          previous_value: Json | null
          workspace_id: string
        }
        Insert: {
          change_type: string
          changed_by_admin_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          note?: string | null
          previous_value?: Json | null
          workspace_id: string
        }
        Update: {
          change_type?: string
          changed_by_admin_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          note?: string | null
          previous_value?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_config_log_changed_by_admin_id_fkey"
            columns: ["changed_by_admin_id"]
            isOneToOne: false
            referencedRelation: "legatus_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_config_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_roles: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          level: number
          permissions: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          level: number
          permissions?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          level?: number
          permissions?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_templates: {
        Row: {
          created_at: string
          created_by_admin_id: string | null
          default_follow_up_rules: Json
          default_meeting_types: Json
          default_metrics: Json
          default_modules: Json
          default_production_unit: Json
          default_roles: Json
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by_admin_id?: string | null
          default_follow_up_rules?: Json
          default_meeting_types?: Json
          default_metrics?: Json
          default_modules?: Json
          default_production_unit?: Json
          default_roles?: Json
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by_admin_id?: string | null
          default_follow_up_rules?: Json
          default_meeting_types?: Json
          default_metrics?: Json
          default_modules?: Json
          default_production_unit?: Json
          default_roles?: Json
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_templates_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "legatus_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          frozen_at: string | null
          id: string
          invite_token: string
          name: string
          owner_user_id: string | null
          plan: string
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          frozen_at?: string | null
          id?: string
          invite_token: string
          name: string
          owner_user_id?: string | null
          plan?: string
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          frozen_at?: string | null
          id?: string
          invite_token?: string
          name?: string
          owner_user_id?: string | null
          plan?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invite: { Args: { _token: string }; Returns: string }
      complete_workspace_setup: {
        Args: { _name: string; _workspace_id: string }
        Returns: undefined
      }
      gen_invite_token: { Args: never; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      get_user_workspace: { Args: { _user_id: string }; Returns: string }
      get_workspace_by_invite_token: {
        Args: { _token: string }
        Returns: {
          default_role_key: string
          id: string
          name: string
          status: string
        }[]
      }
      is_in_subtree: {
        Args: { _root_id: string; _target_id: string }
        Returns: boolean
      }
      is_legatus_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_legatus_admin: { Args: { _user_id: string }; Returns: boolean }
      rotate_workspace_invite_token: {
        Args: { _workspace_id: string }
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
    Enums: {},
  },
} as const
