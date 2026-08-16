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
    PostgrestVersion: "14.15"
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
      categoria: {
        Row: {
          activo: boolean
          creado_en: string
          id: string
          matiz: number
          nombre: string
          orden: number
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"]
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          id: string
          matiz?: number
          nombre: string
          orden?: number
          unidad_negocio?: Database["public"]["Enums"]["unidad_negocio"]
        }
        Update: {
          activo?: boolean
          creado_en?: string
          id?: string
          matiz?: number
          nombre?: string
          orden?: number
          unidad_negocio?: Database["public"]["Enums"]["unidad_negocio"]
        }
        Relationships: []
      }
      negocio: {
        Row: {
          activo: boolean
          creado_en: string
          id: Database["public"]["Enums"]["unidad_negocio"]
          nombre: string
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          id: Database["public"]["Enums"]["unidad_negocio"]
          nombre: string
        }
        Update: {
          activo?: boolean
          creado_en?: string
          id?: Database["public"]["Enums"]["unidad_negocio"]
          nombre?: string
        }
        Relationships: []
      }
      perfil: {
        Row: {
          activo: boolean
          creado_en: string
          id: string
          nombre: string
          pin_bloqueado_hasta: string | null
          pin_hash: string | null
          pin_intentos_fallidos: number
          rol: Database["public"]["Enums"]["rol_usuario"]
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          id: string
          nombre: string
          pin_bloqueado_hasta?: string | null
          pin_hash?: string | null
          pin_intentos_fallidos?: number
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Update: {
          activo?: boolean
          creado_en?: string
          id?: string
          nombre?: string
          pin_bloqueado_hasta?: string | null
          pin_hash?: string | null
          pin_intentos_fallidos?: number
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Relationships: []
      }
      precio_historial: {
        Row: {
          costo_anterior: number | null
          costo_nuevo: number | null
          creado_en: string
          id: number
          motivo: string | null
          precio_anterior: number | null
          precio_nuevo: number
          producto_id: string
          usuario_id: string | null
        }
        Insert: {
          costo_anterior?: number | null
          costo_nuevo?: number | null
          creado_en?: string
          id?: number
          motivo?: string | null
          precio_anterior?: number | null
          precio_nuevo: number
          producto_id: string
          usuario_id?: string | null
        }
        Update: {
          costo_anterior?: number | null
          costo_nuevo?: number | null
          creado_en?: string
          id?: number
          motivo?: string | null
          precio_anterior?: number | null
          precio_nuevo?: number
          producto_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precio_historial_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precio_historial_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      producto: {
        Row: {
          activo: boolean
          actualizado_en: string
          categoria_id: string
          costo_usd: number | null
          creado_en: string
          id: string
          nombre: string
          nombre_busqueda: string | null
          origen: string | null
          precio_venta_usd: number
          sku: string | null
          stock_actual: number
          stock_minimo: number
          unidad_medida: Database["public"]["Enums"]["unidad_medida"]
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"]
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          categoria_id: string
          costo_usd?: number | null
          creado_en?: string
          id?: string
          nombre: string
          nombre_busqueda?: string | null
          origen?: string | null
          precio_venta_usd: number
          sku?: string | null
          stock_actual?: number
          stock_minimo?: number
          unidad_medida?: Database["public"]["Enums"]["unidad_medida"]
          unidad_negocio?: Database["public"]["Enums"]["unidad_negocio"]
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          categoria_id?: string
          costo_usd?: number | null
          creado_en?: string
          id?: string
          nombre?: string
          nombre_busqueda?: string | null
          origen?: string | null
          precio_venta_usd?: number
          sku?: string | null
          stock_actual?: number
          stock_minimo?: number
          unidad_medida?: Database["public"]["Enums"]["unidad_medida"]
          unidad_negocio?: Database["public"]["Enums"]["unidad_negocio"]
        }
        Relationships: [
          {
            foreignKeyName: "producto_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["id"]
          },
        ]
      }
      tasa_cambio: {
        Row: {
          creado_en: string
          id: number
          moneda_base: Database["public"]["Enums"]["moneda"]
          moneda_destino: Database["public"]["Enums"]["moneda"]
          nota: string | null
          usuario_id: string | null
          valor: number
          vigente_desde: string
        }
        Insert: {
          creado_en?: string
          id?: number
          moneda_base?: Database["public"]["Enums"]["moneda"]
          moneda_destino?: Database["public"]["Enums"]["moneda"]
          nota?: string | null
          usuario_id?: string | null
          valor: number
          vigente_desde?: string
        }
        Update: {
          creado_en?: string
          id?: number
          moneda_base?: Database["public"]["Enums"]["moneda"]
          moneda_destino?: Database["public"]["Enums"]["moneda"]
          nota?: string | null
          usuario_id?: string | null
          valor?: number
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasa_cambio_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      definir_pin: { Args: { p_pin: string }; Returns: undefined }
      normalizar: { Args: { t: string }; Returns: string }
      rol_actual: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      tasa_vigente: { Args: never; Returns: number }
      unaccent: { Args: { "": string }; Returns: string }
      validar_pin: { Args: { p_pin: string }; Returns: boolean }
    }
    Enums: {
      moneda: "USD" | "VES"
      rol_usuario: "dueno" | "mostrador"
      unidad_medida: "UND" | "KG" | "LITRO" | "PACK"
      unidad_negocio: "bodega" | "cerveza" | "thais"
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
    Enums: {
      moneda: ["USD", "VES"],
      rol_usuario: ["dueno", "mostrador"],
      unidad_medida: ["UND", "KG", "LITRO", "PACK"],
      unidad_negocio: ["bodega", "cerveza", "thais"],
    },
  },
} as const
