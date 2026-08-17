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
      cliente: {
        Row: {
          activo: boolean
          creado_en: string
          id: string
          nombre: string
          nombre_busqueda: string | null
          nota: string | null
          origen: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          id?: string
          nombre: string
          nombre_busqueda?: string | null
          nota?: string | null
          origen?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          creado_en?: string
          id?: string
          nombre?: string
          nombre_busqueda?: string | null
          nota?: string | null
          origen?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      deuda_movimiento: {
        Row: {
          anulado: boolean
          anulado_en: string | null
          anulado_motivo: string | null
          anulado_por: string | null
          cliente_id: string
          creado_en: string
          id: number
          metodo: Database["public"]["Enums"]["metodo_pago"] | null
          monto_usd: number
          nota: string | null
          tasa_aplicada: number
          tipo: Database["public"]["Enums"]["tipo_movimiento_deuda"]
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"]
          usuario_id: string
          venta_id: string | null
        }
        Insert: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_motivo?: string | null
          anulado_por?: string | null
          cliente_id: string
          creado_en?: string
          id?: number
          metodo?: Database["public"]["Enums"]["metodo_pago"] | null
          monto_usd: number
          nota?: string | null
          tasa_aplicada: number
          tipo: Database["public"]["Enums"]["tipo_movimiento_deuda"]
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"]
          usuario_id: string
          venta_id?: string | null
        }
        Update: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_motivo?: string | null
          anulado_por?: string | null
          cliente_id?: string
          creado_en?: string
          id?: number
          metodo?: Database["public"]["Enums"]["metodo_pago"] | null
          monto_usd?: number
          nota?: string | null
          tasa_aplicada?: number
          tipo?: Database["public"]["Enums"]["tipo_movimiento_deuda"]
          unidad_negocio?: Database["public"]["Enums"]["unidad_negocio"]
          usuario_id?: string
          venta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deuda_movimiento_anulado_por_fkey"
            columns: ["anulado_por"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deuda_movimiento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deuda_movimiento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente_saldo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "deuda_movimiento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deuda_movimiento_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "venta"
            referencedColumns: ["id"]
          },
        ]
      }
      deuda_por_revisar: {
        Row: {
          cliente_id: string
          creado_en: string
          id: number
          monto_sugerido: number | null
          nota_original: string
          origen: string
          resuelto: boolean
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"]
        }
        Insert: {
          cliente_id: string
          creado_en?: string
          id?: number
          monto_sugerido?: number | null
          nota_original: string
          origen: string
          resuelto?: boolean
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"]
        }
        Update: {
          cliente_id?: string
          creado_en?: string
          id?: number
          monto_sugerido?: number | null
          nota_original?: string
          origen?: string
          resuelto?: boolean
          unidad_negocio?: Database["public"]["Enums"]["unidad_negocio"]
        }
        Relationships: [
          {
            foreignKeyName: "deuda_por_revisar_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deuda_por_revisar_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente_saldo"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      egreso: {
        Row: {
          anulado: boolean
          anulado_en: string | null
          anulado_motivo: string | null
          anulado_por: string | null
          categoria: Database["public"]["Enums"]["categoria_egreso"]
          creado_en: string
          descripcion: string
          id: string
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto_usd: number
          referencia: string | null
          tasa_aplicada: number
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"]
          usuario_id: string
        }
        Insert: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_motivo?: string | null
          anulado_por?: string | null
          categoria?: Database["public"]["Enums"]["categoria_egreso"]
          creado_en?: string
          descripcion: string
          id?: string
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto_usd: number
          referencia?: string | null
          tasa_aplicada: number
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"]
          usuario_id: string
        }
        Update: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_motivo?: string | null
          anulado_por?: string | null
          categoria?: Database["public"]["Enums"]["categoria_egreso"]
          creado_en?: string
          descripcion?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago"]
          monto_usd?: number
          referencia?: string | null
          tasa_aplicada?: number
          unidad_negocio?: Database["public"]["Enums"]["unidad_negocio"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "egreso_anulado_por_fkey"
            columns: ["anulado_por"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egreso_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      movimiento_stock: {
        Row: {
          cantidad: number
          costo_unitario_usd: number | null
          creado_en: string
          id: number
          motivo: Database["public"]["Enums"]["motivo_ajuste"] | null
          nota: string | null
          producto_id: string
          stock_resultante: number
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id: string
          venta_id: string | null
        }
        Insert: {
          cantidad: number
          costo_unitario_usd?: number | null
          creado_en?: string
          id?: number
          motivo?: Database["public"]["Enums"]["motivo_ajuste"] | null
          nota?: string | null
          producto_id: string
          stock_resultante: number
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id: string
          venta_id?: string | null
        }
        Update: {
          cantidad?: number
          costo_unitario_usd?: number | null
          creado_en?: string
          id?: number
          motivo?: Database["public"]["Enums"]["motivo_ajuste"] | null
          nota?: string | null
          producto_id?: string
          stock_resultante?: number
          tipo?: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id?: string
          venta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimiento_stock_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_stock_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto_cobertura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_stock_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto_rotacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_stock_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_stock_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "venta"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "precio_historial_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto_cobertura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precio_historial_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto_rotacion"
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
      venta: {
        Row: {
          anulada: boolean
          anulada_en: string | null
          anulada_motivo: string | null
          anulada_por: string | null
          cliente_id: string | null
          correlativo: number
          creado_en: string
          id: string
          idempotencia: string | null
          tasa_aplicada: number
          total_usd: number
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"]
          unidades: number
          usuario_id: string
        }
        Insert: {
          anulada?: boolean
          anulada_en?: string | null
          anulada_motivo?: string | null
          anulada_por?: string | null
          cliente_id?: string | null
          correlativo?: never
          creado_en?: string
          id?: string
          idempotencia?: string | null
          tasa_aplicada: number
          total_usd: number
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"]
          unidades: number
          usuario_id: string
        }
        Update: {
          anulada?: boolean
          anulada_en?: string | null
          anulada_motivo?: string | null
          anulada_por?: string | null
          cliente_id?: string | null
          correlativo?: never
          creado_en?: string
          id?: string
          idempotencia?: string | null
          tasa_aplicada?: number
          total_usd?: number
          unidad_negocio?: Database["public"]["Enums"]["unidad_negocio"]
          unidades?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_anulada_por_fkey"
            columns: ["anulada_por"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente_saldo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "venta_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      venta_linea: {
        Row: {
          cantidad: number
          id: number
          nombre_snapshot: string
          precio_unitario_usd: number
          producto_id: string
          subtotal_usd: number
          venta_id: string
        }
        Insert: {
          cantidad: number
          id?: number
          nombre_snapshot: string
          precio_unitario_usd: number
          producto_id: string
          subtotal_usd: number
          venta_id: string
        }
        Update: {
          cantidad?: number
          id?: number
          nombre_snapshot?: string
          precio_unitario_usd?: number
          producto_id?: string
          subtotal_usd?: number
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_linea_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_linea_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto_cobertura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_linea_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "producto_rotacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_linea_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "venta"
            referencedColumns: ["id"]
          },
        ]
      }
      venta_pago: {
        Row: {
          id: number
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto_usd: number
          venta_id: string
        }
        Insert: {
          id?: number
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto_usd: number
          venta_id: string
        }
        Update: {
          id?: number
          metodo?: Database["public"]["Enums"]["metodo_pago"]
          monto_usd?: number
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_pago_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "venta"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cliente_saldo: {
        Row: {
          cliente_id: string | null
          deuda_mas_antigua: string | null
          nombre: string | null
          saldo_usd: number | null
          ultimo_movimiento: string | null
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"] | null
        }
        Relationships: []
      }
      movimiento_caja: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_egreso"] | null
          cliente_id: string | null
          concepto: string | null
          creado_en: string | null
          documento_id: string | null
          flujo: string | null
          id: string | null
          metodo: Database["public"]["Enums"]["metodo_pago"] | null
          monto_usd: number | null
          origen: string | null
          tasa_aplicada: number | null
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"] | null
        }
        Relationships: []
      }
      producto_cobertura: {
        Row: {
          activo: boolean | null
          dias_cobertura: number | null
          id: string | null
          nombre: string | null
          stock_actual: number | null
          stock_minimo: number | null
          ultima_venta: string | null
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"] | null
          vendidos_30d: number | null
          vendidos_7d: number | null
          vendidos_90d: number | null
        }
        Relationships: []
      }
      producto_rotacion: {
        Row: {
          id: string | null
          nombre: string | null
          ultima_venta: string | null
          vendidos_30d: number | null
          vendidos_7d: number | null
          vendidos_90d: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      anular_abono: {
        Args: { p_motivo: string; p_movimiento_id: number }
        Returns: undefined
      }
      anular_egreso: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      anular_venta: {
        Args: { p_motivo: string; p_venta_id: string }
        Returns: undefined
      }
      aplicar_ajustes: {
        Args: {
          p_ajustes: Json
          p_motivo: Database["public"]["Enums"]["motivo_ajuste"]
          p_nota?: string
        }
        Returns: number
      }
      crear_venta: {
        Args: {
          p_cliente_id?: string
          p_idempotencia?: string
          p_lineas: Json
          p_negocio: Database["public"]["Enums"]["unidad_negocio"]
          p_pagos: Json
          p_tasa_cliente: number
        }
        Returns: {
          anulada: boolean
          anulada_en: string | null
          anulada_motivo: string | null
          anulada_por: string | null
          cliente_id: string | null
          correlativo: number
          creado_en: string
          id: string
          idempotencia: string | null
          tasa_aplicada: number
          total_usd: number
          unidad_negocio: Database["public"]["Enums"]["unidad_negocio"]
          unidades: number
          usuario_id: string
        }
        SetofOptions: {
          from: "*"
          to: "venta"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      definir_pin: { Args: { p_pin: string }; Returns: undefined }
      descartar_revision: { Args: { p_id: number }; Returns: undefined }
      normalizar: { Args: { t: string }; Returns: string }
      registrar_abono: {
        Args: {
          p_cliente_id: string
          p_metodo: Database["public"]["Enums"]["metodo_pago"]
          p_monto: number
          p_negocio: Database["public"]["Enums"]["unidad_negocio"]
          p_nota?: string
        }
        Returns: number
      }
      registrar_deuda: {
        Args: {
          p_cliente_id: string
          p_monto: number
          p_tasa: number
          p_venta_id: string
        }
        Returns: number
      }
      registrar_deuda_manual: {
        Args: {
          p_cliente_id: string
          p_monto: number
          p_negocio: Database["public"]["Enums"]["unidad_negocio"]
          p_nota?: string
        }
        Returns: number
      }
      reponer_producto: {
        Args: {
          p_actualizar_costo?: boolean
          p_cantidad: number
          p_costo_unitario_usd?: number
          p_producto_id: string
          p_proveedor?: string
        }
        Returns: undefined
      }
      resolver_revision: {
        Args: { p_id: number; p_monto: number }
        Returns: number
      }
      resumen_dia: {
        Args: {
          p_inicio_dia?: string
          p_negocio: Database["public"]["Enums"]["unidad_negocio"]
        }
        Returns: Json
      }
      rol_actual: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      saldo_caja: {
        Args: {
          p_hasta?: string
          p_negocio: Database["public"]["Enums"]["unidad_negocio"]
        }
        Returns: {
          metodo: Database["public"]["Enums"]["metodo_pago"]
          saldo_usd: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      tasa_vigente: { Args: never; Returns: number }
      unaccent: { Args: { "": string }; Returns: string }
      validar_pin: { Args: { p_pin: string }; Returns: boolean }
    }
    Enums: {
      categoria_egreso:
        | "proveedor"
        | "insumos"
        | "servicios"
        | "sueldos"
        | "retiro"
        | "otro"
      metodo_pago:
        | "efectivo-ves"
        | "efectivo-usd"
        | "punto"
        | "pago-movil"
        | "biopago"
        | "credito"
      moneda: "USD" | "VES"
      motivo_ajuste:
        | "conteo"
        | "merma"
        | "vencimiento"
        | "robo"
        | "error"
        | "otro"
      rol_usuario: "dueno" | "mostrador"
      tipo_movimiento:
        | "venta"
        | "anulacion"
        | "reposicion"
        | "ajuste"
        | "importacion"
      tipo_movimiento_deuda: "deuda" | "abono" | "ajuste"
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
      categoria_egreso: [
        "proveedor",
        "insumos",
        "servicios",
        "sueldos",
        "retiro",
        "otro",
      ],
      metodo_pago: [
        "efectivo-ves",
        "efectivo-usd",
        "punto",
        "pago-movil",
        "biopago",
        "credito",
      ],
      moneda: ["USD", "VES"],
      motivo_ajuste: [
        "conteo",
        "merma",
        "vencimiento",
        "robo",
        "error",
        "otro",
      ],
      rol_usuario: ["dueno", "mostrador"],
      tipo_movimiento: [
        "venta",
        "anulacion",
        "reposicion",
        "ajuste",
        "importacion",
      ],
      tipo_movimiento_deuda: ["deuda", "abono", "ajuste"],
      unidad_medida: ["UND", "KG", "LITRO", "PACK"],
      unidad_negocio: ["bodega", "cerveza", "thais"],
    },
  },
} as const
