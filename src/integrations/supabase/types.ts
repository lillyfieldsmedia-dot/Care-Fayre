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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agency_profiles: {
        Row: {
          active_jobs_count: number
          agency_name: string
          bio: string | null
          cqc_explanation: string | null
          cqc_last_checked: string | null
          cqc_location_id: string | null
          cqc_provider_id: string | null
          cqc_rating: Database["public"]["Enums"]["cqc_rating"] | null
          cqc_verified: boolean
          created_at: string
          id: string
          insurance_confirmed: boolean
          latitude: number | null
          longitude: number | null
          phone: string | null
          service_area_postcodes: string[] | null
          service_radius_miles: number
          updated_at: string
          user_id: string
          website: string | null
          years_in_operation: number | null
        }
        Insert: {
          active_jobs_count?: number
          agency_name: string
          bio?: string | null
          cqc_explanation?: string | null
          cqc_last_checked?: string | null
          cqc_location_id?: string | null
          cqc_provider_id?: string | null
          cqc_rating?: Database["public"]["Enums"]["cqc_rating"] | null
          cqc_verified?: boolean
          created_at?: string
          id?: string
          insurance_confirmed?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          service_area_postcodes?: string[] | null
          service_radius_miles?: number
          updated_at?: string
          user_id: string
          website?: string | null
          years_in_operation?: number | null
        }
        Update: {
          active_jobs_count?: number
          agency_name?: string
          bio?: string | null
          cqc_explanation?: string | null
          cqc_last_checked?: string | null
          cqc_location_id?: string | null
          cqc_provider_id?: string | null
          cqc_rating?: Database["public"]["Enums"]["cqc_rating"] | null
          cqc_verified?: boolean
          created_at?: string
          id?: string
          insurance_confirmed?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          service_area_postcodes?: string[] | null
          service_radius_miles?: number
          updated_at?: string
          user_id?: string
          website?: string | null
          years_in_operation?: number | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          bid_window_hours: number
          cqc_api_base: string
          id: string
          max_radius_miles: number
          min_bid_decrement: number
          notification_email: string
          platform_fee_pct: number
        }
        Insert: {
          bid_window_hours?: number
          cqc_api_base?: string
          id?: string
          max_radius_miles?: number
          min_bid_decrement?: number
          notification_email?: string
          platform_fee_pct?: number
        }
        Update: {
          bid_window_hours?: number
          cqc_api_base?: string
          id?: string
          max_radius_miles?: number
          min_bid_decrement?: number
          notification_email?: string
          platform_fee_pct?: number
        }
        Relationships: []
      }
      bids: {
        Row: {
          agency_profile_id: string
          bidder_id: string
          care_request_id: string
          created_at: string
          distance_miles: number | null
          hourly_rate: number
          id: string
          notes: string | null
          overnight_rate: number | null
          status: Database["public"]["Enums"]["bid_status"]
        }
        Insert: {
          agency_profile_id: string
          bidder_id: string
          care_request_id: string
          created_at?: string
          distance_miles?: number | null
          hourly_rate: number
          id?: string
          notes?: string | null
          overnight_rate?: number | null
          status?: Database["public"]["Enums"]["bid_status"]
        }
        Update: {
          agency_profile_id?: string
          bidder_id?: string
          care_request_id?: string
          created_at?: string
          distance_miles?: number | null
          hourly_rate?: number
          id?: string
          notes?: string | null
          overnight_rate?: number | null
          status?: Database["public"]["Enums"]["bid_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bids_agency_profile_id_fkey"
            columns: ["agency_profile_id"]
            isOneToOne: false
            referencedRelation: "agency_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_care_request_id_fkey"
            columns: ["care_request_id"]
            isOneToOne: false
            referencedRelation: "care_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      care_requests: {
        Row: {
          bid_deadline: string | null
          bids_count: number
          care_types: string[]
          created_at: string
          creator_id: string
          description: string | null
          frequency: string
          hours_per_week: number
          id: string
          latitude: number | null
          longitude: number | null
          lowest_bid_rate: number | null
          night_type: string | null
          nights_per_week: number | null
          postcode: string
          recipient_address: string
          recipient_dob: string | null
          recipient_name: string
          relationship_to_holder: string
          start_date: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          winning_bid_id: string | null
        }
        Insert: {
          bid_deadline?: string | null
          bids_count?: number
          care_types?: string[]
          created_at?: string
          creator_id: string
          description?: string | null
          frequency?: string
          hours_per_week?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          lowest_bid_rate?: number | null
          night_type?: string | null
          nights_per_week?: number | null
          postcode: string
          recipient_address?: string
          recipient_dob?: string | null
          recipient_name?: string
          relationship_to_holder?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          winning_bid_id?: string | null
        }
        Update: {
          bid_deadline?: string | null
          bids_count?: number
          care_types?: string[]
          created_at?: string
          creator_id?: string
          description?: string | null
          frequency?: string
          hours_per_week?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          lowest_bid_rate?: number | null
          night_type?: string | null
          nights_per_week?: number | null
          postcode?: string
          recipient_address?: string
          recipient_dob?: string | null
          recipient_name?: string
          relationship_to_holder?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          winning_bid_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_winning_bid"
            columns: ["winning_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          agency_agreed_at: string | null
          agency_id: string
          agreement_text: string
          created_at: string
          customer_agreed_at: string | null
          customer_id: string
          id: string
          job_id: string
        }
        Insert: {
          agency_agreed_at?: string | null
          agency_id: string
          agreement_text: string
          created_at?: string
          customer_agreed_at?: string | null
          customer_id: string
          id?: string
          job_id: string
        }
        Update: {
          agency_agreed_at?: string | null
          agency_id?: string
          agreement_text?: string
          created_at?: string
          customer_agreed_at?: string | null
          customer_id?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          agency_id: string
          agency_profile_id: string
          agreed_hours_per_week: number
          care_request_id: string
          created_at: string
          customer_id: string
          id: string
          locked_hourly_rate: number
          start_date: string | null
          status: Database["public"]["Enums"]["job_status"]
          total_paid_to_date: number
          updated_at: string
          winning_bid_id: string
        }
        Insert: {
          agency_id: string
          agency_profile_id: string
          agreed_hours_per_week: number
          care_request_id: string
          created_at?: string
          customer_id: string
          id?: string
          locked_hourly_rate: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          total_paid_to_date?: number
          updated_at?: string
          winning_bid_id: string
        }
        Update: {
          agency_id?: string
          agency_profile_id?: string
          agreed_hours_per_week?: number
          care_request_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          locked_hourly_rate?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          total_paid_to_date?: number
          updated_at?: string
          winning_bid_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_agency_profile_id_fkey"
            columns: ["agency_profile_id"]
            isOneToOne: false
            referencedRelation: "agency_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_care_request_id_fkey"
            columns: ["care_request_id"]
            isOneToOne: false
            referencedRelation: "care_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_winning_bid_id_fkey"
            columns: ["winning_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_id: string
          related_job_id: string | null
          related_request_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_id: string
          related_job_id?: string | null
          related_request_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_id?: string
          related_job_id?: string | null
          related_request_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "care_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          job_id: string
          paid_at: string | null
          status: string
          timesheet_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          job_id: string
          paid_at?: string | null
          status?: string
          timesheet_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          job_id?: string
          paid_at?: string | null
          status?: string
          timesheet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          postcode: string | null
          profile_photo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          postcode?: string | null
          profile_photo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          postcode?: string | null
          profile_photo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          agency_profile_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          job_id: string
          star_rating: number
        }
        Insert: {
          agency_profile_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          job_id: string
          star_rating: number
        }
        Update: {
          agency_profile_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          job_id?: string
          star_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_agency_profile_id_fkey"
            columns: ["agency_profile_id"]
            isOneToOne: false
            referencedRelation: "agency_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_at: string | null
          created_at: string
          hours_worked: number
          id: string
          job_id: string
          notes: string | null
          status: string
          submitted_by: string
          updated_at: string
          week_starting: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          hours_worked?: number
          id?: string
          job_id: string
          notes?: string | null
          status?: string
          submitted_by: string
          updated_at?: string
          week_starting: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          hours_worked?: number
          id?: string
          job_id?: string
          notes?: string | null
          status?: string
          submitted_by?: string
          updated_at?: string
          week_starting?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "agency" | "admin"
      bid_status: "active" | "accepted" | "rejected" | "withdrawn"
      cqc_rating: "Outstanding" | "Good" | "Requires Improvement" | "Inadequate"
      job_status:
        | "active"
        | "paused"
        | "completed"
        | "disputed"
        | "cancelled"
        | "pending"
      request_status:
        | "open"
        | "accepting_bids"
        | "accepted"
        | "closed"
        | "cancelled"
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
      app_role: ["customer", "agency", "admin"],
      bid_status: ["active", "accepted", "rejected", "withdrawn"],
      cqc_rating: ["Outstanding", "Good", "Requires Improvement", "Inadequate"],
      job_status: [
        "active",
        "paused",
        "completed",
        "disputed",
        "cancelled",
        "pending",
      ],
      request_status: [
        "open",
        "accepting_bids",
        "accepted",
        "closed",
        "cancelled",
      ],
    },
  },
} as const
