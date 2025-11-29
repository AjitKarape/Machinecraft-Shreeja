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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      action_tasks: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string | null
          created_at: string
          current_balance: number
          id: string
          is_active: boolean
          is_primary: boolean
          last_statement_date: string | null
          name: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          is_primary?: boolean
          last_statement_date?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          is_primary?: boolean
          last_statement_date?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          bank_name: string | null
          created_at: string
          date: string
          description: string
          expense_head: string | null
          id: string
          remark: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          bank_name?: string | null
          created_at?: string
          date: string
          description: string
          expense_head?: string | null
          id?: string
          remark?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bank_name?: string | null
          created_at?: string
          date?: string
          description?: string
          expense_head?: string | null
          id?: string
          remark?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_notes: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_leave: boolean | null
          notes: string | null
          updated_at: string | null
          worker_name: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          is_leave?: boolean | null
          notes?: string | null
          updated_at?: string | null
          worker_name: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_leave?: boolean | null
          notes?: string | null
          updated_at?: string | null
          worker_name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_mapping: {
        Row: {
          created_at: string
          expense_head: string
          group_name: string
          id: string
          is_revenue: boolean
          opening_balance: number | null
          opening_balance_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expense_head: string
          group_name: string
          id?: string
          is_revenue?: boolean
          opening_balance?: number | null
          opening_balance_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expense_head?: string
          group_name?: string
          id?: string
          is_revenue?: boolean
          opening_balance?: number | null
          opening_balance_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          expense_head: string
          id: string
          month: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          expense_head: string
          id?: string
          month: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          expense_head?: string
          id?: string
          month?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          quantity: number
          sku: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          quantity?: number
          sku?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          quantity?: number
          sku?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      production_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          quantity_produced: number | null
          session: string
          sub_part_id: string | null
          toy_id: string | null
          updated_at: string
          worker_name: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          quantity_produced?: number | null
          session: string
          sub_part_id?: string | null
          toy_id?: string | null
          updated_at?: string
          worker_name: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          quantity_produced?: number | null
          session?: string
          sub_part_id?: string | null
          toy_id?: string | null
          updated_at?: string
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_sub_part_id_fkey"
            columns: ["sub_part_id"]
            isOneToOne: false
            referencedRelation: "sub_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revenue: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          month: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          month: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          month?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      step_fields: {
        Row: {
          checkbox_value: boolean | null
          created_at: string | null
          field_order: number
          field_type: Database["public"]["Enums"]["field_type"]
          id: string
          image_url: string | null
          label: string
          step_id: string
          text_value: string | null
          updated_at: string | null
        }
        Insert: {
          checkbox_value?: boolean | null
          created_at?: string | null
          field_order: number
          field_type: Database["public"]["Enums"]["field_type"]
          id?: string
          image_url?: string | null
          label: string
          step_id: string
          text_value?: string | null
          updated_at?: string | null
        }
        Update: {
          checkbox_value?: boolean | null
          created_at?: string | null
          field_order?: number
          field_type?: Database["public"]["Enums"]["field_type"]
          id?: string
          image_url?: string | null
          label?: string
          step_id?: string
          text_value?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "step_fields_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "task_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          closing_balance: number | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          opening_balance: number
          produced_quantity: number
          toy_id: string
          updated_at: string | null
        }
        Insert: {
          closing_balance?: number | null
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          opening_balance?: number
          produced_quantity?: number
          toy_id: string
          updated_at?: string | null
        }
        Update: {
          closing_balance?: number | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          opening_balance?: number
          produced_quantity?: number
          toy_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string | null
          id: string
          is_deleted: boolean
          notes: string | null
          price: number | null
          quantity: number
          stock_after: number
          toy_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          price?: number | null
          quantity: number
          stock_after: number
          toy_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          is_deleted?: boolean
          notes?: string | null
          price?: number | null
          quantity?: number
          stock_after?: number
          toy_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_parts: {
        Row: {
          created_at: string
          id: string
          name: string
          opening_balance: number
          quantity_required_per_toy: number
          toy_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          opening_balance?: number
          quantity_required_per_toy?: number
          toy_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          opening_balance?: number
          quantity_required_per_toy?: number
          toy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_parts_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      task_steps: {
        Row: {
          created_at: string | null
          id: string
          is_completed: boolean | null
          name: string
          parent_step_id: string | null
          step_number: number
          task_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          name: string
          parent_step_id?: string | null
          step_number: number
          task_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          name?: string
          parent_step_id?: string | null
          step_number?: number
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_steps_parent_step_id_fkey"
            columns: ["parent_step_id"]
            isOneToOne: false
            referencedRelation: "task_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "action_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      toys: {
        Row: {
          created_at: string
          current_stock: number
          description: string | null
          id: string
          image_url: string | null
          last_transaction_at: string | null
          low_stock_threshold: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          image_url?: string | null
          last_transaction_at?: string | null
          low_stock_threshold?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          image_url?: string | null
          last_transaction_at?: string | null
          low_stock_threshold?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "worker" | "editor"
      field_type: "text" | "image" | "checkbox"
      task_priority: "low" | "medium" | "high"
      task_status: "not_started" | "in_progress" | "completed"
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
      app_role: ["admin", "worker", "editor"],
      field_type: ["text", "image", "checkbox"],
      task_priority: ["low", "medium", "high"],
      task_status: ["not_started", "in_progress", "completed"],
    },
  },
} as const
