// Regenerated via Supabase MCP `generate_typescript_types` after each migration.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          age: number | null
          created_at: string
          gender: string | null
          id: string
          loyalty_points: number
          name: string
          org_id: string
          outstanding_balance: number
          phone: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          created_at?: string
          gender?: string | null
          id?: string
          loyalty_points?: number
          name: string
          org_id: string
          outstanding_balance?: number
          phone?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          created_at?: string
          gender?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          org_id?: string
          outstanding_balance?: number
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          discount_pct: number
          id: string
          invoice_id: string
          line_total: number
          medicine_batch_id: string
          prescribing_doctor: string | null
          prescription_ref: string | null
          qty: number
          tax_amount: number
          tax_rate: number
          unit_rate: number
        }
        Insert: {
          discount_pct?: number
          id?: string
          invoice_id: string
          line_total: number
          medicine_batch_id: string
          prescribing_doctor?: string | null
          prescription_ref?: string | null
          qty: number
          tax_amount?: number
          tax_rate?: number
          unit_rate: number
        }
        Update: {
          discount_pct?: number
          id?: string
          invoice_id?: string
          line_total?: number
          medicine_batch_id?: string
          prescribing_doctor?: string | null
          prescription_ref?: string | null
          qty?: number
          tax_amount?: number
          tax_rate?: number
          unit_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_medicine_batch_id_fkey"
            columns: ["medicine_batch_id"]
            isOneToOne: false
            referencedRelation: "medicine_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          cgst_total: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_total: number
          grand_total: number
          id: string
          invoice_no: string
          org_id: string
          parent_invoice_id: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          sgst_total: number
          status: Database["public"]["Enums"]["invoice_status"]
          taxable_value: number
        }
        Insert: {
          cgst_total?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          invoice_no: string
          org_id: string
          parent_invoice_id?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          sgst_total?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          taxable_value?: number
        }
        Update: {
          cgst_total?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          invoice_no?: string
          org_id?: string
          parent_invoice_id?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          sgst_total?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          taxable_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_parent_invoice_id_fkey"
            columns: ["parent_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_batches: {
        Row: {
          batch_no: string
          created_at: string
          expiry_date: string
          id: string
          medicine_id: string
          mfg_date: string | null
          mrp: number | null
          org_id: string
          purchase_rate: number
          qty_in_stock: number
          sale_rate: number
          supplier_id: string | null
        }
        Insert: {
          batch_no: string
          created_at?: string
          expiry_date: string
          id?: string
          medicine_id: string
          mfg_date?: string | null
          mrp?: number | null
          org_id: string
          purchase_rate: number
          qty_in_stock?: number
          sale_rate: number
          supplier_id?: string | null
        }
        Update: {
          batch_no?: string
          created_at?: string
          expiry_date?: string
          id?: string
          medicine_id?: string
          mfg_date?: string | null
          mrp?: number | null
          org_id?: string
          purchase_rate?: number
          qty_in_stock?: number
          sale_rate?: number
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicine_batches_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_stock_summary"
            referencedColumns: ["medicine_id"]
          },
          {
            foreignKeyName: "medicine_batches_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicine_batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicine_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string
          default_purchase_rate: number | null
          default_sale_rate: number | null
          generic_name: string | null
          hsn_code: string | null
          id: string
          manufacturer: string | null
          name: string
          org_id: string
          pack_size: string | null
          reorder_level: number
          schedule_category: string | null
          tax_rate: number | null
          unit: string | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          default_purchase_rate?: number | null
          default_sale_rate?: number | null
          generic_name?: string | null
          hsn_code?: string | null
          id?: string
          manufacturer?: string | null
          name: string
          org_id: string
          pack_size?: string | null
          reorder_level?: number
          schedule_category?: string | null
          tax_rate?: number | null
          unit?: string | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          default_purchase_rate?: number | null
          default_sale_rate?: number | null
          generic_name?: string | null
          hsn_code?: string | null
          id?: string
          manufacturer?: string | null
          name?: string
          org_id?: string
          pack_size?: string | null
          reorder_level?: number
          schedule_category?: string | null
          tax_rate?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          default_reorder_level: number
          gstin: string | null
          id: string
          invoice_prefix: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          default_reorder_level?: number
          gstin?: string | null
          id?: string
          invoice_prefix?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          default_reorder_level?: number
          gstin?: string | null
          id?: string
          invoice_prefix?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          org_id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_picks: {
        Row: {
          created_at: string
          id: string
          medicine_id: string
          org_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_id: string
          org_id: string
          position: number
        }
        Update: {
          created_at?: string
          id?: string
          medicine_id?: string
          org_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "quick_picks_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_picks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string
          change_qty: number
          created_at: string
          id: string
          org_id: string
          reason: Database["public"]["Enums"]["stock_reason"]
          reference_id: string | null
        }
        Insert: {
          batch_id: string
          change_qty: number
          created_at?: string
          id?: string
          org_id: string
          reason: Database["public"]["Enums"]["stock_reason"]
          reference_id?: string | null
        }
        Update: {
          batch_id?: string
          change_qty?: number
          created_at?: string
          id?: string
          org_id?: string
          reason?: Database["public"]["Enums"]["stock_reason"]
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "medicine_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          org_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          org_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      medicine_stock_summary: {
        Row: {
          avg_purchase_rate: number | null
          batch_count: number | null
          category: string | null
          default_sale_rate: number | null
          generic_name: string | null
          manufacturer: string | null
          medicine_id: string | null
          name: string | null
          nearest_expiry: string | null
          org_id: string | null
          pack_size: string | null
          reorder_level: number | null
          total_qty: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_drug_register: {
        Row: {
          batch_no: string | null
          created_at: string | null
          customer_name: string | null
          invoice_id: string | null
          invoice_item_id: string | null
          invoice_no: string | null
          medicine_name: string | null
          org_id: string | null
          prescribing_doctor: string | null
          prescription_ref: string | null
          qty: number | null
          schedule_category: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invite: {
        Args: { p_full_name: string; p_token: string }
        Returns: string
      }
      auth_org_id: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      bootstrap_organization: {
        Args: { p_full_name: string; p_org_name: string }
        Returns: string
      }
      create_invite: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: { id: string; token: string }[]
      }
      create_invoice: {
        Args: {
          p_customer_id: string | null
          p_discount_total: number
          p_invoice_no: string
          p_items: Json
          p_org_id: string
          p_payment_mode: Database["public"]["Enums"]["payment_mode"]
        }
        Returns: string
      }
      dashboard_alerts: {
        Args: Record<PropertyKey, never>
        Returns: { low_stock_count: number; expiring_soon_count: number; outstanding_total: number }[]
      }
      get_invite_by_token: {
        Args: { p_token: string }
        Returns: {
          accepted: boolean
          email: string
          org_name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      profit_by_day: {
        Args: { p_from: string; p_to: string }
        Returns: { day: string; profit: number }[]
      }
      profit_by_hour: {
        Args: { p_from: string; p_to: string }
        Returns: { hour: string; profit: number }[]
      }
      return_invoice: { Args: { p_invoice_id: string }; Returns: undefined }
      revenue_by_day: {
        Args: { p_from: string; p_to: string }
        Returns: { day: string; total: number; order_count: number }[]
      }
      revenue_by_hour: {
        Args: { p_from: string; p_to: string }
        Returns: { hour: string; total: number; order_count: number }[]
      }
      sales_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          total_revenue: number
          order_count: number
          avg_bill_value: number
          returns_count: number
          cash_total: number
          card_total: number
          upi_total: number
          credit_total: number
        }[]
      }
      top_selling_medicines: {
        Args: { p_from: string; p_to: string; p_limit?: number }
        Returns: { medicine_id: string; name: string; qty_sold: number; revenue: number }[]
      }
    }
    Enums: {
      invoice_status: "paid" | "returned" | "partial"
      payment_mode: "cash" | "card" | "upi" | "credit"
      stock_reason: "purchase" | "sale" | "return" | "adjustment"
      user_role: "ceo" | "pharmacist" | "staff"
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
      invoice_status: ["paid", "returned", "partial"],
      payment_mode: ["cash", "card", "upi", "credit"],
      stock_reason: ["purchase", "sale", "return", "adjustment"],
      user_role: ["ceo", "pharmacist", "staff"],
    },
  },
} as const
