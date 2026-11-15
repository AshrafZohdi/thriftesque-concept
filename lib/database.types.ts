
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "looks": {
                  Row: {
                    "created_at": string,"id": string,"note": string | null,"product_codes": (string)[],"source": Database["public"]['Enums']["look_source"],"status": Database["public"]['Enums']["look_status"],"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"product_codes": (string)[],"source"?: Database["public"]['Enums']["look_source"],"status"?: Database["public"]['Enums']["look_status"],"title": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"product_codes"?: (string)[],"source"?: Database["public"]['Enums']["look_source"],"status"?: Database["public"]['Enums']["look_status"],"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"products": {
                  Row: {
                    "brand": string,"category": string | null,"code": string,"colour": string | null,"condition": string | null,"created_at": string,"cutout": string | null,"description": string | null,"era": string | null,"id": string,"measurements": NonNullable<Json>,"name": string,"photos": (string)[],"price_qar": number | null,"size": string | null,"sold_at": string | null,"status": Database["public"]['Enums']["product_status"],"styling_tip": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand"?: string,"category"?: string | null,"code"?: string,"colour"?: string | null,"condition"?: string | null,"created_at"?: string,"cutout"?: string | null,"description"?: string | null,"era"?: string | null,"id"?: string,"measurements"?: NonNullable<Json>,"name": string,"photos"?: (string)[],"price_qar"?: number | null,"size"?: string | null,"sold_at"?: string | null,"status"?: Database["public"]['Enums']["product_status"],"styling_tip"?: string | null
                  }
                  Update: {
                    "brand"?: string,"category"?: string | null,"code"?: string,"colour"?: string | null,"condition"?: string | null,"created_at"?: string,"cutout"?: string | null,"description"?: string | null,"era"?: string | null,"id"?: string,"measurements"?: NonNullable<Json>,"name"?: string,"photos"?: (string)[],"price_qar"?: number | null,"size"?: string | null,"sold_at"?: string | null,"status"?: Database["public"]['Enums']["product_status"],"styling_tip"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"settings": {
                  Row: {
                    "about_text": string,"contact_email": string,"delivery_fees": NonNullable<Json>,"delivery_text": string,"drop_name": string,"id": number,"operator_name": string,"order_retention_text": string,"payment_text": string,"reserved_hold_text": string,"returns_text": string,"whatsapp_number": string
                  }
                  ComputedFields: never
                  Insert: {
                    "about_text"?: string,"contact_email"?: string,"delivery_fees"?: NonNullable<Json>,"delivery_text"?: string,"drop_name"?: string,"id"?: number,"operator_name"?: string,"order_retention_text"?: string,"payment_text"?: string,"reserved_hold_text"?: string,"returns_text"?: string,"whatsapp_number"?: string
                  }
                  Update: {
                    "about_text"?: string,"contact_email"?: string,"delivery_fees"?: NonNullable<Json>,"delivery_text"?: string,"drop_name"?: string,"id"?: number,"operator_name"?: string,"order_retention_text"?: string,"payment_text"?: string,"reserved_hold_text"?: string,"returns_text"?: string,"whatsapp_number"?: string
                  }
                  Relationships: [
                    
                  ]
                },"team_members": {
                  Row: {
                    "created_at": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"name"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "format_product_code":
{ Args: { "n": number }; Returns: string
                           },
"is_team":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"schema_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"sync_product_code_seq":
{ Args: Record<PropertyKey, never>; Returns: number
                           }
          }
          Enums: {
            "look_source": "ai"|"team","look_status": "draft"|"published","product_status": "live"|"reserved"|"sold"|"hidden"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "look_source": ["ai", "team"],"look_status": ["draft", "published"],"product_status": ["live", "reserved", "sold", "hidden"]
          }
        }
} as const
