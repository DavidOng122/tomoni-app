export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      connections: {
        Row: {
          connected_at: string
          connection_id: string
          connection_status: string
          created_at: string
          source_invitation_id: string | null
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          connected_at?: string
          connection_id?: string
          connection_status: string
          created_at?: string
          source_invitation_id?: string | null
          user_a_id: string
          user_b_id: string
        }
        Update: {
          connected_at?: string
          connection_id?: string
          connection_status?: string
          created_at?: string
          source_invitation_id?: string | null
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_source_invitation_id_fkey"
            columns: ["source_invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["invitation_id"]
          },
          {
            foreignKeyName: "connections_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          left_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          left_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          closed_at: string | null
          conversation_id: string
          conversation_status: string
          created_at: string
          event_id: string | null
          fixed_plan_id: string | null
          related_invitation_id: string | null
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          conversation_id?: string
          conversation_status: string
          created_at?: string
          event_id?: string | null
          fixed_plan_id?: string | null
          related_invitation_id?: string | null
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          conversation_id?: string
          conversation_status?: string
          created_at?: string
          event_id?: string | null
          fixed_plan_id?: string | null
          related_invitation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "conversations_fixed_plan_id_fkey"
            columns: ["fixed_plan_id"]
            isOneToOne: false
            referencedRelation: "fixed_plans"
            referencedColumns: ["fixed_plan_id"]
          },
          {
            foreignKeyName: "conversations_related_invitation_id_fkey"
            columns: ["related_invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["invitation_id"]
          },
        ]
      }
      event_participations: {
        Row: {
          arrival_time: string | null
          created_at: string
          event_id: string
          participation_date: string | null
          participation_id: string
          participation_status: string
          planned_duration_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          event_id: string
          participation_date?: string | null
          participation_id?: string
          participation_status: string
          planned_duration_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          event_id?: string
          participation_date?: string | null
          participation_id?: string
          participation_status?: string
          planned_duration_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          approval_required: boolean
          capacity: number | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          end_at: string | null
          event_id: string
          event_status: string
          event_type: string
          last_checked_at: string | null
          latitude: number | null
          longitude: number | null
          looking_for_participants: boolean
          official_url: string | null
          place_id: string | null
          place_name: string
          poster_url: string | null
          registration_deadline: string | null
          registration_required: boolean
          registration_status: string | null
          registration_url: string | null
          source_name: string | null
          source_updated_at: string | null
          start_at: string
          status_message: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          approval_required?: boolean
          capacity?: number | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          end_at?: string | null
          event_id?: string
          event_status: string
          event_type: string
          last_checked_at?: string | null
          latitude?: number | null
          longitude?: number | null
          looking_for_participants?: boolean
          official_url?: string | null
          place_id?: string | null
          place_name: string
          poster_url?: string | null
          registration_deadline?: string | null
          registration_required?: boolean
          registration_status?: string | null
          registration_url?: string | null
          source_name?: string | null
          source_updated_at?: string | null
          start_at: string
          status_message?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          approval_required?: boolean
          capacity?: number | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          end_at?: string | null
          event_id?: string
          event_status?: string
          event_type?: string
          last_checked_at?: string | null
          latitude?: number | null
          longitude?: number | null
          looking_for_participants?: boolean
          official_url?: string | null
          place_id?: string | null
          place_name?: string
          poster_url?: string | null
          registration_deadline?: string | null
          registration_required?: boolean
          registration_status?: string | null
          registration_url?: string | null
          source_name?: string | null
          source_updated_at?: string | null
          start_at?: string
          status_message?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_plans: {
        Row: {
          activity_type: string
          created_at: string
          custom_activity_name: string | null
          days_of_week: string[]
          fixed_plan_id: string
          latitude: number
          longitude: number
          place_id: string | null
          place_name: string
          plan_status: string
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          custom_activity_name?: string | null
          days_of_week: string[]
          fixed_plan_id?: string
          latitude: number
          longitude: number
          place_id?: string | null
          place_name: string
          plan_status?: string
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          custom_activity_name?: string | null
          days_of_week?: string[]
          fixed_plan_id?: string
          latitude?: number
          longitude?: number
          place_id?: string | null
          place_name?: string
          plan_status?: string
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          event_id: string | null
          expires_at: string | null
          fixed_plan_id: string | null
          invitation_id: string
          invitation_status: string
          invitation_type: string
          message: string | null
          receiver_user_id: string
          responded_at: string | null
          sender_user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          expires_at?: string | null
          fixed_plan_id?: string | null
          invitation_id?: string
          invitation_status: string
          invitation_type: string
          message?: string | null
          receiver_user_id: string
          responded_at?: string | null
          sender_user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          expires_at?: string | null
          fixed_plan_id?: string | null
          invitation_id?: string
          invitation_status?: string
          invitation_type?: string
          message?: string | null
          receiver_user_id?: string
          responded_at?: string | null
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "invitations_fixed_plan_id_fkey"
            columns: ["fixed_plan_id"]
            isOneToOne: false
            referencedRelation: "fixed_plans"
            referencedColumns: ["fixed_plan_id"]
          },
          {
            foreignKeyName: "invitations_receiver_user_id_fkey"
            columns: ["receiver_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          message_id: string
          message_type: string
          sender_user_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          message_id?: string
          message_type: string
          sender_user_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          message_id?: string
          message_type?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_range: string
          avatar_url: string
          bio: string | null
          created_at: string
          gender: string | null
          nickname: string
          profile_id: string
          profile_status: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range: string
          avatar_url: string
          bio?: string | null
          created_at?: string
          gender?: string | null
          nickname: string
          profile_id?: string
          profile_status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string
          avatar_url?: string
          bio?: string | null
          created_at?: string
          gender?: string | null
          nickname?: string
          profile_id?: string
          profile_status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_status: string
          created_at: string
          id: string
          onboarding_status: string
          updated_at: string
        }
        Insert: {
          account_status?: string
          created_at?: string
          id: string
          onboarding_status?: string
          updated_at?: string
        }
        Update: {
          account_status?: string
          created_at?: string
          id?: string
          onboarding_status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_event_invitation: {
        Args: { p_invitation_id: string }
        Returns: string
      }
      approve_event_participant: {
        Args: { p_participation_id: string }
        Returns: string
      }
      cancel_event_invitation: {
        Args: { p_invitation_id: string }
        Returns: boolean
      }
      cancel_event_participation: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      complete_onboarding: {
        Args: { p_profile: Json; p_schedules: Json }
        Returns: Json
      }
      create_event_invitation: {
        Args: { p_event_id: string; p_receiver_user_id: string }
        Returns: string
      }
      create_user_event: {
        Args: {
          p_address?: string
          p_approval_required?: boolean
          p_capacity?: number
          p_description?: string
          p_end_at: string
          p_latitude?: number
          p_longitude?: number
          p_place_id?: string
          p_place_name?: string
          p_start_at: string
          p_title: string
        }
        Returns: string
      }
      decline_event_invitation: {
        Args: { p_invitation_id: string }
        Returns: boolean
      }
      get_discover_recommendations: {
        Args: { p_my_plan_id?: string }
        Returns: Json
      }
      get_event_join_requests: {
        Args: { p_event_id: string }
        Returns: {
          avatar_url: string
          nickname: string
          participation_id: string
          requested_at: string
          user_id: string
        }[]
      }
      get_event_participant_preview: {
        Args: { p_event_id: string }
        Returns: {
          avatar_url: string
          nickname: string
          participant_count: number
          user_id: string
        }[]
      }
      get_received_event_invitations: {
        Args: never
        Returns: {
          created_at: string
          event_id: string
          event_title: string
          expires_at: string
          invitation_id: string
          sender_avatar_url: string
          sender_nickname: string
          sender_user_id: string
        }[]
      }
      get_same_event_people: {
        Args: { p_event_id: string }
        Returns: {
          avatar_url: string
          compatibility_label: string
          nickname: string
          user_id: string
        }[]
      }
      join_event: { Args: { p_event_id: string }; Returns: undefined }
      join_event_with_plan: {
        Args: {
          p_arrival_time: string
          p_event_id: string
          p_planned_duration_minutes?: number
        }
        Returns: undefined
      }
      reject_event_participant: {
        Args: { p_participation_id: string }
        Returns: string
      }
      set_user_event_poster: {
        Args: { p_event_id: string; p_poster_url: string }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

