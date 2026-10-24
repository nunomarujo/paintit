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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      acc_accounts: {
        Row: {
          ativa: boolean
          codigo: string
          natureza: string
          nome: string
        }
        Insert: {
          ativa?: boolean
          codigo: string
          natureza: string
          nome: string
        }
        Update: {
          ativa?: boolean
          codigo?: string
          natureza?: string
          nome?: string
        }
        Relationships: []
      }
      acc_entries: {
        Row: {
          created_at: string
          data: string
          descricao: string
          id: string
          origem: string
          origem_id: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao: string
          id?: string
          origem: string
          origem_id: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          origem?: string
          origem_id?: string
        }
        Relationships: []
      }
      acc_lines: {
        Row: {
          conta: string
          credito_cents: number
          debito_cents: number
          entry_id: string
          id: string
        }
        Insert: {
          conta: string
          credito_cents?: number
          debito_cents?: number
          entry_id: string
          id?: string
        }
        Update: {
          conta?: string
          credito_cents?: number
          debito_cents?: number
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acc_lines_conta_fkey"
            columns: ["conta"]
            isOneToOne: false
            referencedRelation: "acc_accounts"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "acc_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "acc_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      acc_period_log: {
        Row: {
          acao: string
          em: string
          id: string
          mes: string
          por: string | null
        }
        Insert: {
          acao: string
          em?: string
          id?: string
          mes: string
          por?: string | null
        }
        Update: {
          acao?: string
          em?: string
          id?: string
          mes?: string
          por?: string | null
        }
        Relationships: []
      }
      acc_periods: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          fechado: boolean
          mes: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          fechado?: boolean
          mes: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          fechado?: boolean
          mes?: string
        }
        Relationships: []
      }
      avaliador_bonus_credits: {
        Row: {
          created_at: string
          estado: string
          id: string
          invite_id: string
          org_id: string
          usado_em: string | null
          usado_em_payout: string | null
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          invite_id: string
          org_id: string
          usado_em?: string | null
          usado_em_payout?: string | null
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          invite_id?: string
          org_id?: string
          usado_em?: string | null
          usado_em_payout?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliador_bonus_credits_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: true
            referencedRelation: "supplier_painter_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliador_bonus_credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliador_bonus_credits_usado_em_payout_fkey"
            columns: ["usado_em_payout"]
            isOneToOne: false
            referencedRelation: "survey_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_imports: {
        Row: {
          ate: string | null
          created_at: string
          created_by: string | null
          de: string | null
          duplicadas: number
          ficheiro: string
          formato: string
          iban: string | null
          id: string
          linhas: number
          novas: number
        }
        Insert: {
          ate?: string | null
          created_at?: string
          created_by?: string | null
          de?: string | null
          duplicadas: number
          ficheiro: string
          formato: string
          iban?: string | null
          id?: string
          linhas: number
          novas: number
        }
        Update: {
          ate?: string | null
          created_at?: string
          created_by?: string | null
          de?: string | null
          duplicadas?: number
          ficheiro?: string
          formato?: string
          iban?: string | null
          id?: string
          linhas?: number
          novas?: number
        }
        Relationships: []
      }
      bank_lines: {
        Row: {
          automatica: boolean
          chave: string
          classificacao: string
          classificada_em: string | null
          classificada_por: string | null
          created_at: string
          data: string
          data_valor: string | null
          descricao: string
          id: string
          import_id: string
          notas: string | null
          redemption_id: string | null
          saldo_cents: number | null
          stripe_payout_id: string | null
          valor_cents: number
        }
        Insert: {
          automatica?: boolean
          chave: string
          classificacao?: string
          classificada_em?: string | null
          classificada_por?: string | null
          created_at?: string
          data: string
          data_valor?: string | null
          descricao: string
          id?: string
          import_id: string
          notas?: string | null
          redemption_id?: string | null
          saldo_cents?: number | null
          stripe_payout_id?: string | null
          valor_cents: number
        }
        Update: {
          automatica?: boolean
          chave?: string
          classificacao?: string
          classificada_em?: string | null
          classificada_por?: string | null
          created_at?: string
          data?: string
          data_valor?: string | null
          descricao?: string
          id?: string
          import_id?: string
          notas?: string | null
          redemption_id?: string | null
          saldo_cents?: number | null
          stripe_payout_id?: string | null
          valor_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_lines_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "bank_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_lines_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "referral_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_lines_stripe_payout_id_fkey"
            columns: ["stripe_payout_id"]
            isOneToOne: false
            referencedRelation: "stripe_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_identifiers: {
        Row: {
          created_at: string
          nif: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          nif: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          nif?: string
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_at: string
          motivo: string
          user_id: string
        }
        Insert: {
          blocked_at?: string
          motivo: string
          user_id: string
        }
        Update: {
          blocked_at?: string
          motivo?: string
          user_id?: string
        }
        Relationships: []
      }
      buildings: {
        Row: {
          acessos: string | null
          ano_construcao: number | null
          area_aproximada_cm2: number | null
          artigo_matricial: string | null
          codigo_postal: string
          concelho: string
          created_at: string
          created_by: string
          fachadas: number | null
          forma_implantacao: string | null
          fracoes: number | null
          id: string
          localidade: string
          morada: string
          nome_interno: string
          obras_pretendidas: string[]
          org_id: string
          pisos: number | null
          tem_elevador: boolean
          tem_varandas: boolean
          tipo: Database["public"]["Enums"]["building_kind"]
          updated_at: string
        }
        Insert: {
          acessos?: string | null
          ano_construcao?: number | null
          area_aproximada_cm2?: number | null
          artigo_matricial?: string | null
          codigo_postal: string
          concelho: string
          created_at?: string
          created_by?: string
          fachadas?: number | null
          forma_implantacao?: string | null
          fracoes?: number | null
          id?: string
          localidade: string
          morada: string
          nome_interno: string
          obras_pretendidas?: string[]
          org_id: string
          pisos?: number | null
          tem_elevador?: boolean
          tem_varandas?: boolean
          tipo: Database["public"]["Enums"]["building_kind"]
          updated_at?: string
        }
        Update: {
          acessos?: string | null
          ano_construcao?: number | null
          area_aproximada_cm2?: number | null
          artigo_matricial?: string | null
          codigo_postal?: string
          concelho?: string
          created_at?: string
          created_by?: string
          fachadas?: number | null
          forma_implantacao?: string | null
          fracoes?: number | null
          id?: string
          localidade?: string
          morada?: string
          nome_interno?: string
          obras_pretendidas?: string[]
          org_id?: string
          pisos?: number | null
          tem_elevador?: boolean
          tem_varandas?: boolean
          tipo?: Database["public"]["Enums"]["building_kind"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_violations: {
        Row: {
          anulada_em: string | null
          created_at: string
          id: string
          motivos: string[]
          onde: string
          texto: string
          user_id: string
        }
        Insert: {
          anulada_em?: string | null
          created_at?: string
          id?: string
          motivos: string[]
          onde: string
          texto: string
          user_id: string
        }
        Update: {
          anulada_em?: string | null
          created_at?: string
          id?: string
          motivos?: string[]
          onde?: string
          texto?: string
          user_id?: string
        }
        Relationships: []
      }
      engagement_events: {
        Row: {
          actor: string
          amount_cents: number | null
          at: string
          created_at: string
          engagement_id: string
          id: string
          kind: Database["public"]["Enums"]["engagement_event_kind"]
          payload: Json
          reveal: boolean
        }
        Insert: {
          actor?: string
          amount_cents?: number | null
          at?: string
          created_at?: string
          engagement_id: string
          id?: string
          kind: Database["public"]["Enums"]["engagement_event_kind"]
          payload?: Json
          reveal?: boolean
        }
        Update: {
          actor?: string
          amount_cents?: number | null
          at?: string
          created_at?: string
          engagement_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["engagement_event_kind"]
          payload?: Json
          reveal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "engagement_events_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          advance_cents: number
          base_cents: number
          carried_from: string | null
          client_org_id: string
          created_at: string
          id: string
          painter_org_id: string
          proposal_id: string
          referral_discount_bp: number
          request_id: string
          rules_version: string
        }
        Insert: {
          advance_cents: number
          base_cents: number
          carried_from?: string | null
          client_org_id: string
          created_at?: string
          id?: string
          painter_org_id: string
          proposal_id: string
          referral_discount_bp?: number
          request_id: string
          rules_version: string
        }
        Update: {
          advance_cents?: number
          base_cents?: number
          carried_from?: string | null
          client_org_id?: string
          created_at?: string
          id?: string
          painter_org_id?: string
          proposal_id?: string
          referral_discount_bp?: number
          request_id?: string
          rules_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_carried_from_fkey"
            columns: ["carried_from"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_documents: {
        Row: {
          atcud: string | null
          cliente_nif: string | null
          cliente_nome: string
          created_at: string
          data: string
          emitido_em: string | null
          erro: string | null
          estado: string
          id: string
          numero: string | null
          origin_id: string
          origin_type: string
          pdf_path: string | null
          provider: string
          provider_document_id: string | null
          reason: string
          referencia_origin_id: string | null
          referencia_origin_type: string | null
          tipo: string
          total_cents: number
        }
        Insert: {
          atcud?: string | null
          cliente_nif?: string | null
          cliente_nome: string
          created_at?: string
          data: string
          emitido_em?: string | null
          erro?: string | null
          estado?: string
          id?: string
          numero?: string | null
          origin_id: string
          origin_type: string
          pdf_path?: string | null
          provider?: string
          provider_document_id?: string | null
          reason: string
          referencia_origin_id?: string | null
          referencia_origin_type?: string | null
          tipo: string
          total_cents: number
        }
        Update: {
          atcud?: string | null
          cliente_nif?: string | null
          cliente_nome?: string
          created_at?: string
          data?: string
          emitido_em?: string | null
          erro?: string | null
          estado?: string
          id?: string
          numero?: string | null
          origin_id?: string
          origin_type?: string
          pdf_path?: string | null
          provider?: string
          provider_document_id?: string | null
          reason?: string
          referencia_origin_id?: string | null
          referencia_origin_type?: string | null
          tipo?: string
          total_cents?: number
        }
        Relationships: []
      }
      listing_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          painter_org_id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string
          painter_org_id: string
          request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          painter_org_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_invites_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_invites_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reports: {
        Row: {
          created_at: string
          id: string
          motivo: string
          reporter: string
          request_id: string
          resolucao: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          motivo: string
          reporter?: string
          request_id: string
          resolucao?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string
          reporter?: string
          request_id?: string
          resolucao?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "listing_reports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      material_orders: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          delivered_at: string | null
          embalagens: number
          engagement_id: string
          estado: Database["public"]["Enums"]["order_status"]
          id: string
          nota: string | null
          painter_org_id: string
          product_id: string
          supplier_org_id: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          embalagens: number
          engagement_id: string
          estado?: Database["public"]["Enums"]["order_status"]
          id?: string
          nota?: string | null
          painter_org_id: string
          product_id: string
          supplier_org_id: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          embalagens?: number
          engagement_id?: string
          estado?: Database["public"]["Enums"]["order_status"]
          id?: string
          nota?: string | null
          painter_org_id?: string
          product_id?: string
          supplier_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_orders_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_orders_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_orders_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      moloni_token: {
        Row: {
          access_token: string
          expires_at: string
          id: boolean
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          expires_at: string
          id?: boolean
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          expires_at?: string
          id?: boolean
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lida_em: string | null
          link: string
          org_id: string
          texto: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida_em?: string | null
          link: string
          org_id: string
          texto: string
        }
        Update: {
          created_at?: string
          id?: string
          lida_em?: string | null
          link?: string
          org_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_documents: {
        Row: {
          building_id: string | null
          classe: number | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["doc_kind"]
          nome_ficheiro: string
          notas_validacao: string | null
          org_id: string
          status: Database["public"]["Enums"]["doc_status"]
          storage_path: string
          submitted_by: string
          validated_at: string | null
          validated_by: string | null
          valido_ate: string | null
        }
        Insert: {
          building_id?: string | null
          classe?: number | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["doc_kind"]
          nome_ficheiro: string
          notas_validacao?: string | null
          org_id: string
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path: string
          submitted_by?: string
          validated_at?: string | null
          validated_by?: string | null
          valido_ate?: string | null
        }
        Update: {
          building_id?: string | null
          classe?: number | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["doc_kind"]
          nome_ficheiro?: string
          notas_validacao?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string
          submitted_by?: string
          validated_at?: string | null
          validated_by?: string | null
          valido_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_documents_building_same_org"
            columns: ["building_id", "org_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "org_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          org_kind: Database["public"]["Enums"]["org_kind"] | null
          org_nome: string | null
          role: Database["public"]["Enums"]["member_role"]
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id: string
          org_kind?: Database["public"]["Enums"]["org_kind"] | null
          org_nome?: string | null
          role: Database["public"]["Enums"]["member_role"]
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          org_kind?: Database["public"]["Enums"]["org_kind"] | null
          org_nome?: string | null
          role?: Database["public"]["Enums"]["member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          org_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          alertas_autorizados: boolean
          atendimento_publico: string | null
          codigo_postal: string | null
          created_at: string
          created_by: string
          email_contacto: string | null
          gerida_por: string | null
          id: string
          kind: Database["public"]["Enums"]["org_kind"]
          localidade: string | null
          morada_fiscal: string | null
          nif: string | null
          nome: string
          telefone: string | null
          updated_at: string
          zonas_servico: string[]
        }
        Insert: {
          alertas_autorizados?: boolean
          atendimento_publico?: string | null
          codigo_postal?: string | null
          created_at?: string
          created_by?: string
          email_contacto?: string | null
          gerida_por?: string | null
          id?: string
          kind: Database["public"]["Enums"]["org_kind"]
          localidade?: string | null
          morada_fiscal?: string | null
          nif?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string
          zonas_servico?: string[]
        }
        Update: {
          alertas_autorizados?: boolean
          atendimento_publico?: string | null
          codigo_postal?: string | null
          created_at?: string
          created_by?: string
          email_contacto?: string | null
          gerida_por?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["org_kind"]
          localidade?: string | null
          morada_fiscal?: string | null
          nif?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
          zonas_servico?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "organizations_gerida_por_fkey"
            columns: ["gerida_por"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      painter_terms_acceptances: {
        Row: {
          accepted_at: string
          accepted_by: string
          painter_org_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          accepted_by?: string
          painter_org_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          accepted_by?: string
          painter_org_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "painter_terms_acceptances_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          acabamento: string | null
          ativo: boolean
          base: string | null
          created_at: string
          created_by: string
          demaos_recomendadas: number | null
          descricao: string | null
          diluicao: string | null
          embalagem_ml: number | null
          ficha_path: string | null
          id: string
          marca: string
          modos_aplicacao: string[]
          nome: string
          org_id: string
          preco_data: string | null
          preco_fornecedor_cents: number | null
          preco_referencia_cents: number | null
          reference_product_id: string | null
          referencia: string | null
          rendimento: number | null
          secagem_horas: number | null
          tipo: Database["public"]["Enums"]["product_type"]
          unidade: string
          updated_at: string
          uso: string | null
        }
        Insert: {
          acabamento?: string | null
          ativo?: boolean
          base?: string | null
          created_at?: string
          created_by?: string
          demaos_recomendadas?: number | null
          descricao?: string | null
          diluicao?: string | null
          embalagem_ml?: number | null
          ficha_path?: string | null
          id?: string
          marca: string
          modos_aplicacao?: string[]
          nome: string
          org_id: string
          preco_data?: string | null
          preco_fornecedor_cents?: number | null
          preco_referencia_cents?: number | null
          reference_product_id?: string | null
          referencia?: string | null
          rendimento?: number | null
          secagem_horas?: number | null
          tipo: Database["public"]["Enums"]["product_type"]
          unidade?: string
          updated_at?: string
          uso?: string | null
        }
        Update: {
          acabamento?: string | null
          ativo?: boolean
          base?: string | null
          created_at?: string
          created_by?: string
          demaos_recomendadas?: number | null
          descricao?: string | null
          diluicao?: string | null
          embalagem_ml?: number | null
          ficha_path?: string | null
          id?: string
          marca?: string
          modos_aplicacao?: string[]
          nome?: string
          org_id?: string
          preco_data?: string | null
          preco_fornecedor_cents?: number | null
          preco_referencia_cents?: number | null
          reference_product_id?: string | null
          referencia?: string | null
          rendimento?: number | null
          secagem_horas?: number | null
          tipo?: Database["public"]["Enums"]["product_type"]
          unidade?: string
          updated_at?: string
          uso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_reference_product_id_fkey"
            columns: ["reference_product_id"]
            isOneToOne: false
            referencedRelation: "reference_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string
          discount_bps: number
          id: string
          max_uses: number | null
          notas: string | null
          uses: number
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string
          discount_bps: number
          id?: string
          max_uses?: number | null
          notas?: string | null
          uses?: number
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string
          discount_bps?: number
          id?: string
          max_uses?: number | null
          notas?: string | null
          uses?: number
          valid_until?: string | null
        }
        Relationships: []
      }
      proposal_lines: {
        Row: {
          categoria: Database["public"]["Enums"]["line_category"]
          created_at: string
          demaos: number | null
          desconto_bps: number | null
          descricao: string
          detalhes: Json
          id: string
          inclusao: Database["public"]["Enums"]["line_inclusion"]
          motivo_diferenca: string | null
          preco_fornecedor_cents: number | null
          preco_unitario_cents: number
          product_id: string | null
          produto: string | null
          proposal_id: string
          quantidade: number
          superficie: Database["public"]["Enums"]["surface_kind"] | null
          surface_ids: string[]
          total_cents: number | null
          trabalho: string | null
          unidade: Database["public"]["Enums"]["line_unit"]
        }
        Insert: {
          categoria: Database["public"]["Enums"]["line_category"]
          created_at?: string
          demaos?: number | null
          desconto_bps?: number | null
          descricao: string
          detalhes?: Json
          id?: string
          inclusao?: Database["public"]["Enums"]["line_inclusion"]
          motivo_diferenca?: string | null
          preco_fornecedor_cents?: number | null
          preco_unitario_cents: number
          product_id?: string | null
          produto?: string | null
          proposal_id: string
          quantidade: number
          superficie?: Database["public"]["Enums"]["surface_kind"] | null
          surface_ids?: string[]
          total_cents?: number | null
          trabalho?: string | null
          unidade?: Database["public"]["Enums"]["line_unit"]
        }
        Update: {
          categoria?: Database["public"]["Enums"]["line_category"]
          created_at?: string
          demaos?: number | null
          desconto_bps?: number | null
          descricao?: string
          detalhes?: Json
          id?: string
          inclusao?: Database["public"]["Enums"]["line_inclusion"]
          motivo_diferenca?: string | null
          preco_fornecedor_cents?: number | null
          preco_unitario_cents?: number
          product_id?: string | null
          produto?: string | null
          proposal_id?: string
          quantidade?: number
          superficie?: Database["public"]["Enums"]["surface_kind"] | null
          surface_ids?: string[]
          total_cents?: number | null
          trabalho?: string | null
          unidade?: Database["public"]["Enums"]["line_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "proposal_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_lines_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_messages: {
        Row: {
          autor: string
          created_at: string
          id: string
          lado: Database["public"]["Enums"]["message_side"]
          proposal_id: string
          request_id: string
          texto: string
        }
        Insert: {
          autor?: string
          created_at?: string
          id?: string
          lado: Database["public"]["Enums"]["message_side"]
          proposal_id: string
          request_id: string
          texto: string
        }
        Update: {
          autor?: string
          created_at?: string
          id?: string
          lado?: Database["public"]["Enums"]["message_side"]
          proposal_id?: string
          request_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_messages_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_versions: {
        Row: {
          id: string
          proposal_id: string
          snapshot: Json
          submitted_at: string
          version: number
        }
        Insert: {
          id?: string
          proposal_id: string
          snapshot: Json
          submitted_at?: string
          version: number
        }
        Update: {
          id?: string
          proposal_id?: string
          snapshot?: Json
          submitted_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          adiantamento_bps: number
          base_cents: number | null
          confirma_mao_obra: boolean
          created_at: string
          created_by: string
          duracao_dias: number | null
          exclusoes: string
          fases: Json
          garantia_anos: number | null
          habilitacao_ok: boolean | null
          id: string
          inicio_possivel: string | null
          iva_bps: number
          iva_cents: number | null
          modo_preco: string
          notas: string
          painter_org_id: string
          pintor_verificado: boolean | null
          preco_ajuste_m2_cents: number | null
          referral_code_id: string | null
          request_id: string
          request_version: number | null
          seguro_at: string | null
          seguro_rc: string | null
          selected_at: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          submitted_at: string | null
          updated_at: string
          validade: string | null
          version: number
        }
        Insert: {
          adiantamento_bps?: number
          base_cents?: number | null
          confirma_mao_obra?: boolean
          created_at?: string
          created_by?: string
          duracao_dias?: number | null
          exclusoes?: string
          fases?: Json
          garantia_anos?: number | null
          habilitacao_ok?: boolean | null
          id?: string
          inicio_possivel?: string | null
          iva_bps?: number
          iva_cents?: number | null
          modo_preco?: string
          notas?: string
          painter_org_id: string
          pintor_verificado?: boolean | null
          preco_ajuste_m2_cents?: number | null
          referral_code_id?: string | null
          request_id: string
          request_version?: number | null
          seguro_at?: string | null
          seguro_rc?: string | null
          selected_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          submitted_at?: string | null
          updated_at?: string
          validade?: string | null
          version?: number
        }
        Update: {
          adiantamento_bps?: number
          base_cents?: number | null
          confirma_mao_obra?: boolean
          created_at?: string
          created_by?: string
          duracao_dias?: number | null
          exclusoes?: string
          fases?: Json
          garantia_anos?: number | null
          habilitacao_ok?: boolean | null
          id?: string
          inicio_possivel?: string | null
          iva_bps?: number
          iva_cents?: number | null
          modo_preco?: string
          notas?: string
          painter_org_id?: string
          pintor_verificado?: boolean | null
          preco_ajuste_m2_cents?: number | null
          referral_code_id?: string | null
          request_id?: string
          request_version?: number | null
          seguro_at?: string | null
          seguro_rc?: string | null
          selected_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          submitted_at?: string | null
          updated_at?: string
          validade?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_products: {
        Row: {
          acabamento: string | null
          base_aquosa: boolean | null
          complementares: string[]
          cores: string | null
          created_at: string
          demaos: string | null
          descricao: string | null
          diluicao: string | null
          embalagens_l: number[]
          foto_path: string | null
          id: string
          marca: string
          nome: string
          nota: string | null
          nota_interna: string | null
          preco_data: string | null
          preco_embalagem_l: number | null
          preco_fonte: string | null
          preco_referencia_cents: number | null
          rendimento_estimado: boolean
          rendimento_m2_l: number | null
          secagem_horas: number | null
          tipo: Database["public"]["Enums"]["product_type"]
          url_ficha_tecnica: string | null
          url_produto: string | null
          uso: string | null
          visivel: boolean
        }
        Insert: {
          acabamento?: string | null
          base_aquosa?: boolean | null
          complementares?: string[]
          cores?: string | null
          created_at?: string
          demaos?: string | null
          descricao?: string | null
          diluicao?: string | null
          embalagens_l?: number[]
          foto_path?: string | null
          id?: string
          marca: string
          nome: string
          nota?: string | null
          nota_interna?: string | null
          preco_data?: string | null
          preco_embalagem_l?: number | null
          preco_fonte?: string | null
          preco_referencia_cents?: number | null
          rendimento_estimado?: boolean
          rendimento_m2_l?: number | null
          secagem_horas?: number | null
          tipo: Database["public"]["Enums"]["product_type"]
          url_ficha_tecnica?: string | null
          url_produto?: string | null
          uso?: string | null
          visivel?: boolean
        }
        Update: {
          acabamento?: string | null
          base_aquosa?: boolean | null
          complementares?: string[]
          cores?: string | null
          created_at?: string
          demaos?: string | null
          descricao?: string | null
          diluicao?: string | null
          embalagens_l?: number[]
          foto_path?: string | null
          id?: string
          marca?: string
          nome?: string
          nota?: string | null
          nota_interna?: string | null
          preco_data?: string | null
          preco_embalagem_l?: number | null
          preco_fonte?: string | null
          preco_referencia_cents?: number | null
          rendimento_estimado?: boolean
          rendimento_m2_l?: number | null
          secagem_horas?: number | null
          tipo?: Database["public"]["Enums"]["product_type"]
          url_ficha_tecnica?: string | null
          url_produto?: string | null
          uso?: string | null
          visivel?: boolean
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          id: string
          max_wins: number
          nota: string | null
          painter_org_id: string | null
          supplier_org_id: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          max_wins?: number
          nota?: string | null
          painter_org_id?: string | null
          supplier_org_id: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          max_wins?: number
          nota?: string | null
          painter_org_id?: string | null
          supplier_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_payouts: {
        Row: {
          amount_cents: number
          code_id: string
          created_at: string
          engagement_id: string
          estado: string
          fee_avisado: boolean
          fee_recebido_em: string | null
          id: string
          invoice_em: string | null
          invoice_numero: string | null
          invoice_path: string | null
          motivo: string | null
          paga_em: string | null
          proposal_id: string
          redemption_id: string | null
          referencia_pagamento: string | null
          supplier_org_id: string
        }
        Insert: {
          amount_cents: number
          code_id: string
          created_at?: string
          engagement_id: string
          estado?: string
          fee_avisado?: boolean
          fee_recebido_em?: string | null
          id?: string
          invoice_em?: string | null
          invoice_numero?: string | null
          invoice_path?: string | null
          motivo?: string | null
          paga_em?: string | null
          proposal_id: string
          redemption_id?: string | null
          referencia_pagamento?: string | null
          supplier_org_id: string
        }
        Update: {
          amount_cents?: number
          code_id?: string
          created_at?: string
          engagement_id?: string
          estado?: string
          fee_avisado?: boolean
          fee_recebido_em?: string | null
          id?: string
          invoice_em?: string | null
          invoice_numero?: string | null
          invoice_path?: string | null
          motivo?: string | null
          paga_em?: string | null
          proposal_id?: string
          redemption_id?: string | null
          referencia_pagamento?: string | null
          supplier_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_payouts_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "referral_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_redemptions: {
        Row: {
          cobra_iva: boolean
          comissao_cents: number
          created_at: string
          created_by: string | null
          estado: string
          iban: string
          id: string
          invoice_em: string | null
          invoice_numero: string | null
          invoice_path: string | null
          isencao_iva: string | null
          iva_cents: number
          liquido_cents: number
          motivo: string | null
          paga_em: string | null
          referencia_pagamento: string | null
          retencao_bps: number
          retencao_cents: number
          supplier_org_id: string
          titular: string
        }
        Insert: {
          cobra_iva: boolean
          comissao_cents: number
          created_at?: string
          created_by?: string | null
          estado?: string
          iban: string
          id?: string
          invoice_em?: string | null
          invoice_numero?: string | null
          invoice_path?: string | null
          isencao_iva?: string | null
          iva_cents: number
          liquido_cents: number
          motivo?: string | null
          paga_em?: string | null
          referencia_pagamento?: string | null
          retencao_bps: number
          retencao_cents: number
          supplier_org_id: string
          titular: string
        }
        Update: {
          cobra_iva?: boolean
          comissao_cents?: number
          created_at?: string
          created_by?: string | null
          estado?: string
          iban?: string
          id?: string
          invoice_em?: string | null
          invoice_numero?: string | null
          invoice_path?: string | null
          isencao_iva?: string | null
          iva_cents?: number
          liquido_cents?: number
          motivo?: string | null
          paga_em?: string | null
          referencia_pagamento?: string | null
          retencao_bps?: number
          retencao_cents?: number
          supplier_org_id?: string
          titular?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_redemptions_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      request_invites: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string
          id: string
          nota: string | null
          painter_org_id: string | null
          redeemed_at: string | null
          request_id: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string
          id?: string
          nota?: string | null
          painter_org_id?: string | null
          redeemed_at?: string | null
          request_id: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          nota?: string | null
          painter_org_id?: string | null
          redeemed_at?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_invites_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_invites_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_listings: {
        Row: {
          aberto: boolean
          area_total_cm2: number
          concelho: string
          cor_acabamento: string | null
          descricao: string
          execucao_ate: string | null
          execucao_desde: string | null
          fachadas: number | null
          forma_implantacao: string | null
          ocupacao_via_publica: string
          pisos: number | null
          prazo_propostas: string
          produtos_preferidos: Json
          published_at: string
          ref: string
          request_id: string
          tem_varandas: boolean
          tipo_imovel: Database["public"]["Enums"]["building_kind"]
          tipo_obra: Database["public"]["Enums"]["work_type"]
          trabalhos: string[]
          trabalhos_modo: string
          version: number
        }
        Insert: {
          aberto?: boolean
          area_total_cm2: number
          concelho: string
          cor_acabamento?: string | null
          descricao: string
          execucao_ate?: string | null
          execucao_desde?: string | null
          fachadas?: number | null
          forma_implantacao?: string | null
          ocupacao_via_publica?: string
          pisos?: number | null
          prazo_propostas: string
          produtos_preferidos?: Json
          published_at: string
          ref: string
          request_id: string
          tem_varandas: boolean
          tipo_imovel: Database["public"]["Enums"]["building_kind"]
          tipo_obra: Database["public"]["Enums"]["work_type"]
          trabalhos: string[]
          trabalhos_modo?: string
          version: number
        }
        Update: {
          aberto?: boolean
          area_total_cm2?: number
          concelho?: string
          cor_acabamento?: string | null
          descricao?: string
          execucao_ate?: string | null
          execucao_desde?: string | null
          fachadas?: number | null
          forma_implantacao?: string | null
          ocupacao_via_publica?: string
          pisos?: number | null
          prazo_propostas?: string
          produtos_preferidos?: Json
          published_at?: string
          ref?: string
          request_id?: string
          tem_varandas?: boolean
          tipo_imovel?: Database["public"]["Enums"]["building_kind"]
          tipo_obra?: Database["public"]["Enums"]["work_type"]
          trabalhos?: string[]
          trabalhos_modo?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "request_listings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_photos: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["photo_kind"]
          legenda: string | null
          notas_revisao: string | null
          request_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          revisao: Database["public"]["Enums"]["photo_review"] | null
          storage_path: string
          submitted_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["photo_kind"]
          legenda?: string | null
          notas_revisao?: string | null
          request_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revisao?: Database["public"]["Enums"]["photo_review"] | null
          storage_path: string
          submitted_by?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["photo_kind"]
          legenda?: string | null
          notas_revisao?: string | null
          request_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revisao?: Database["public"]["Enums"]["photo_review"] | null
          storage_path?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_photos_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_surfaces: {
        Row: {
          altura_cm: number | null
          area_cm2: number | null
          area_direta_cm2: number | null
          created_at: string
          descricao: string | null
          id: string
          kind: Database["public"]["Enums"]["surface_kind"]
          largura_cm: number | null
          origem: Database["public"]["Enums"]["area_source"]
          quantidade: number
          request_id: string
          trabalhos: string[] | null
          vaos_cm2: number | null
        }
        Insert: {
          altura_cm?: number | null
          area_cm2?: number | null
          area_direta_cm2?: number | null
          created_at?: string
          descricao?: string | null
          id?: string
          kind: Database["public"]["Enums"]["surface_kind"]
          largura_cm?: number | null
          origem?: Database["public"]["Enums"]["area_source"]
          quantidade?: number
          request_id: string
          trabalhos?: string[] | null
          vaos_cm2?: number | null
        }
        Update: {
          altura_cm?: number | null
          area_cm2?: number | null
          area_direta_cm2?: number | null
          created_at?: string
          descricao?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["surface_kind"]
          largura_cm?: number | null
          origem?: Database["public"]["Enums"]["area_source"]
          quantidade?: number
          request_id?: string
          trabalhos?: string[] | null
          vaos_cm2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "request_surfaces_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_surveys: {
        Row: {
          clarification_excluded_orgs: string[]
          concluded_at: string | null
          contact_notes: string
          created_at: string
          created_by: string
          id: string
          request_id: string
          reserve_deadline: string | null
          reserved_at: string | null
          scheduled_at: string | null
          status: string
          vendedor_org_id: string | null
          vendedor_user_id: string | null
        }
        Insert: {
          clarification_excluded_orgs?: string[]
          concluded_at?: string | null
          contact_notes?: string
          created_at?: string
          created_by?: string
          id?: string
          request_id: string
          reserve_deadline?: string | null
          reserved_at?: string | null
          scheduled_at?: string | null
          status?: string
          vendedor_org_id?: string | null
          vendedor_user_id?: string | null
        }
        Update: {
          clarification_excluded_orgs?: string[]
          concluded_at?: string | null
          contact_notes?: string
          created_at?: string
          created_by?: string
          id?: string
          request_id?: string
          reserve_deadline?: string | null
          reserved_at?: string | null
          scheduled_at?: string | null
          status?: string
          vendedor_org_id?: string | null
          vendedor_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_surveys_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_surveys_vendedor_org_id_fkey"
            columns: ["vendedor_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comentario: string
          comunicacao: number
          created_at: string
          created_by: string
          engagement_id: string
          id: string
          obra_concluida: boolean
          painter_org_id: string
          prazo: number
          qualidade: number
          resposta: string | null
          resposta_at: string | null
          updated_at: string
        }
        Insert: {
          comentario?: string
          comunicacao: number
          created_at?: string
          created_by?: string
          engagement_id: string
          id?: string
          obra_concluida?: boolean
          painter_org_id: string
          prazo: number
          qualidade: number
          resposta?: string | null
          resposta_at?: string | null
          updated_at?: string
        }
        Update: {
          comentario?: string
          comunicacao?: number
          created_at?: string
          created_by?: string
          engagement_id?: string
          id?: string
          obra_concluida?: boolean
          painter_org_id?: string
          prazo?: number
          qualidade?: number
          resposta?: string | null
          resposta_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      strike_appeals: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decisao: string | null
          estado: string
          id: string
          texto: string
          user_id: string
          violation_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decisao?: string | null
          estado?: string
          id?: string
          texto: string
          user_id: string
          violation_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decisao?: string | null
          estado?: string
          id?: string
          texto?: string
          user_id?: string
          violation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strike_appeals_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: true
            referencedRelation: "contact_violations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_balance_snapshots: {
        Row: {
          available_cents: number
          currency: string
          id: string
          pending_cents: number
          taken_at: string
        }
        Insert: {
          available_cents: number
          currency: string
          id?: string
          pending_cents: number
          taken_at?: string
        }
        Update: {
          available_cents?: number
          currency?: string
          id?: string
          pending_cents?: number
          taken_at?: string
        }
        Relationships: []
      }
      stripe_bt: {
        Row: {
          amount_cents: number
          available_on: string | null
          created_at: string
          currency: string
          description: string | null
          fee_cents: number
          id: string
          invoice_id: string | null
          net_cents: number
          payment_intent: string | null
          reporting_category: string
          source_id: string | null
          synced_at: string
          type: string
        }
        Insert: {
          amount_cents: number
          available_on?: string | null
          created_at: string
          currency: string
          description?: string | null
          fee_cents?: number
          id: string
          invoice_id?: string | null
          net_cents: number
          payment_intent?: string | null
          reporting_category: string
          source_id?: string | null
          synced_at?: string
          type: string
        }
        Update: {
          amount_cents?: number
          available_on?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          fee_cents?: number
          id?: string
          invoice_id?: string | null
          net_cents?: number
          payment_intent?: string | null
          reporting_category?: string
          source_id?: string | null
          synced_at?: string
          type?: string
        }
        Relationships: []
      }
      stripe_bt_review: {
        Row: {
          bt_id: string
          em: string
          nota: string
          por: string | null
        }
        Insert: {
          bt_id: string
          em?: string
          nota: string
          por?: string | null
        }
        Update: {
          bt_id?: string
          em?: string
          nota?: string
          por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_bt_review_bt_id_fkey"
            columns: ["bt_id"]
            isOneToOne: true
            referencedRelation: "stripe_bt"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_payments: {
        Row: {
          amount_cents: number
          created_at: string
          engagement_id: string
          id: string
          kind: string
          payment_intent: string
          refunded_cents: number
        }
        Insert: {
          amount_cents: number
          created_at?: string
          engagement_id: string
          id?: string
          kind: string
          payment_intent: string
          refunded_cents?: number
        }
        Update: {
          amount_cents?: number
          created_at?: string
          engagement_id?: string
          id?: string
          kind?: string
          payment_intent?: string
          refunded_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "stripe_payments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_payouts: {
        Row: {
          amount_cents: number
          arrival_at: string | null
          created_at: string
          currency: string
          id: string
          status: string
          synced_at: string
        }
        Insert: {
          amount_cents: number
          arrival_at?: string | null
          created_at: string
          currency: string
          id: string
          status: string
          synced_at?: string
        }
        Update: {
          amount_cents?: number
          arrival_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          status?: string
          synced_at?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          org_id: string | null
          paid_at: string
          stripe_invoice_id: string
          vat_cents: number | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          org_id?: string | null
          paid_at?: string
          stripe_invoice_id: string
          vat_cents?: number | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          org_id?: string | null
          paid_at?: string
          stripe_invoice_id?: string
          vat_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_customers: {
        Row: {
          nota: string
          org_id: string
          painter_org_id: string
          premium: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          nota?: string
          org_id: string
          painter_org_id: string
          premium?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          nota?: string
          org_id?: string
          painter_org_id?: string
          premium?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_customers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_customers_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_delivery: {
        Row: {
          concelhos: string[]
          condicoes: string
          created_at: string
          custo_cents: number | null
          id: string
          incluida: boolean
          minimo_cents: number | null
          org_id: string
        }
        Insert: {
          concelhos?: string[]
          condicoes?: string
          created_at?: string
          custo_cents?: number | null
          id?: string
          incluida?: boolean
          minimo_cents?: number | null
          org_id: string
        }
        Update: {
          concelhos?: string[]
          condicoes?: string
          created_at?: string
          custo_cents?: number | null
          id?: string
          incluida?: boolean
          minimo_cents?: number | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_delivery_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_discounts: {
        Row: {
          created_at: string
          created_by: string
          desconto_bps: number
          id: string
          max_area_cm2: number | null
          min_area_cm2: number | null
          min_quantidade: number | null
          org_id: string
          pagamento: string | null
          painter_org_id: string | null
          perfil: string | null
          product_id: string | null
          tipo: Database["public"]["Enums"]["product_type"] | null
          valido_ate: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          desconto_bps: number
          id?: string
          max_area_cm2?: number | null
          min_area_cm2?: number | null
          min_quantidade?: number | null
          org_id: string
          pagamento?: string | null
          painter_org_id?: string | null
          perfil?: string | null
          product_id?: string | null
          tipo?: Database["public"]["Enums"]["product_type"] | null
          valido_ate?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          desconto_bps?: number
          id?: string
          max_area_cm2?: number | null
          min_area_cm2?: number | null
          min_quantidade?: number | null
          org_id?: string
          pagamento?: string | null
          painter_org_id?: string | null
          perfil?: string | null
          product_id?: string | null
          tipo?: Database["public"]["Enums"]["product_type"] | null
          valido_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_discounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_discounts_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_discounts_product_same_org"
            columns: ["product_id", "org_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      supplier_painter_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          morada: string
          nome: string
          org_id: string
          referral_code_id: string
          telefone: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          morada: string
          nome: string
          org_id: string
          referral_code_id: string
          telefone: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          morada?: string
          nome?: string
          org_id?: string
          referral_code_id?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_painter_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_painter_invites_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: true
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payout_details: {
        Row: {
          cobra_iva: boolean
          declaracao_retencao: string | null
          iban: string
          isencao_iva: string | null
          org_id: string
          regime_validado: boolean
          retencao_bps: number
          titular: string
          updated_at: string
        }
        Insert: {
          cobra_iva?: boolean
          declaracao_retencao?: string | null
          iban: string
          isencao_iva?: string | null
          org_id: string
          regime_validado?: boolean
          retencao_bps?: number
          titular: string
          updated_at?: string
        }
        Update: {
          cobra_iva?: boolean
          declaracao_retencao?: string | null
          iban?: string
          isencao_iva?: string | null
          org_id?: string
          regime_validado?: boolean
          retencao_bps?: number
          titular?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payout_details_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_referral_invites: {
        Row: {
          active: boolean
          adesao_elegivel_em: string | null
          code: string
          convite_confirmado_em: string | null
          created_at: string
          created_by: string | null
          id: string
          nif: string | null
          nota: string | null
          painter_org_id: string
          supplier_org_id: string | null
        }
        Insert: {
          active?: boolean
          adesao_elegivel_em?: string | null
          code: string
          convite_confirmado_em?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nif?: string | null
          nota?: string | null
          painter_org_id: string
          supplier_org_id?: string | null
        }
        Update: {
          active?: boolean
          adesao_elegivel_em?: string | null
          code?: string
          convite_confirmado_em?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nif?: string | null
          nota?: string | null
          painter_org_id?: string
          supplier_org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_referral_invites_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_referral_invites_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_reviews: {
        Row: {
          atendimento: number
          comentario: string
          created_at: string
          created_by: string
          entrega: number
          id: string
          painter_org_id: string
          produto: number
          resposta: string | null
          resposta_at: string | null
          supplier_org_id: string
          updated_at: string
        }
        Insert: {
          atendimento: number
          comentario?: string
          created_at?: string
          created_by?: string
          entrega: number
          id?: string
          painter_org_id: string
          produto: number
          resposta?: string | null
          resposta_at?: string | null
          supplier_org_id: string
          updated_at?: string
        }
        Update: {
          atendimento?: number
          comentario?: string
          created_at?: string
          created_by?: string
          entrega?: number
          id?: string
          painter_org_id?: string
          produto?: number
          resposta?: string | null
          resposta_at?: string | null
          supplier_org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_reviews_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_reviews_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_subscriptions: {
        Row: {
          discount_bps: number
          org_id: string
          plan: string
          price_cents: number
          promo_code_id: string | null
          started_at: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          discount_bps?: number
          org_id: string
          plan: string
          price_cents: number
          promo_code_id?: string | null
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          discount_bps?: number
          org_id?: string
          plan?: string
          price_cents?: number
          promo_code_id?: string | null
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_subscriptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_survey_coverage: {
        Row: {
          concelhos: string[]
          org_id: string
          updated_at: string
        }
        Insert: {
          concelhos?: string[]
          org_id: string
          updated_at?: string
        }
        Update: {
          concelhos?: string[]
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_survey_coverage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_clarification_items: {
        Row: {
          clarification_id: string
          created_at: string
          id: string
          painter_user_id: string
          texto: string
        }
        Insert: {
          clarification_id: string
          created_at?: string
          id?: string
          painter_user_id: string
          texto: string
        }
        Update: {
          clarification_id?: string
          created_at?: string
          id?: string
          painter_user_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_clarification_items_clarification_id_fkey"
            columns: ["clarification_id"]
            isOneToOne: false
            referencedRelation: "survey_clarifications"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_clarifications: {
        Row: {
          confirm_deadline: string | null
          confirmed_at: string | null
          created_at: string
          id: string
          request_survey_id: string
          respond_deadline: string | null
          respondido_em: string | null
          resposta: string | null
          status: string
          vendedor_org_id: string | null
          vendedor_user_id: string | null
        }
        Insert: {
          confirm_deadline?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          request_survey_id: string
          respond_deadline?: string | null
          respondido_em?: string | null
          resposta?: string | null
          status?: string
          vendedor_org_id?: string | null
          vendedor_user_id?: string | null
        }
        Update: {
          confirm_deadline?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          request_survey_id?: string
          respond_deadline?: string | null
          respondido_em?: string | null
          resposta?: string | null
          status?: string
          vendedor_org_id?: string | null
          vendedor_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_clarifications_request_survey_id_fkey"
            columns: ["request_survey_id"]
            isOneToOne: false
            referencedRelation: "request_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_clarifications_vendedor_org_id_fkey"
            columns: ["vendedor_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_info_reviews: {
        Row: {
          comentario: string
          created_at: string
          nota: number
          painter_user_id: string
          request_survey_id: string
          updated_at: string
        }
        Insert: {
          comentario?: string
          created_at?: string
          nota: number
          painter_user_id: string
          request_survey_id: string
          updated_at?: string
        }
        Update: {
          comentario?: string
          created_at?: string
          nota?: number
          painter_user_id?: string
          request_survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_info_reviews_request_survey_id_fkey"
            columns: ["request_survey_id"]
            isOneToOne: false
            referencedRelation: "request_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_payouts: {
        Row: {
          amount_cents: number
          created_at: string
          engagement_id: string
          estado: string
          fee_recebido_em: string
          id: string
          motivo: string | null
          redemption_id: string | null
          request_survey_id: string
          supplier_org_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          engagement_id: string
          estado?: string
          fee_recebido_em: string
          id?: string
          motivo?: string | null
          redemption_id?: string | null
          request_survey_id: string
          supplier_org_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          engagement_id?: string
          estado?: string
          fee_recebido_em?: string
          id?: string
          motivo?: string | null
          redemption_id?: string | null
          request_survey_id?: string
          supplier_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_payouts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_payouts_redemption_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "survey_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_payouts_request_survey_id_fkey"
            columns: ["request_survey_id"]
            isOneToOne: true
            referencedRelation: "request_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_payouts_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_redemptions: {
        Row: {
          cobra_iva: boolean
          comissao_cents: number
          created_at: string
          created_by: string | null
          estado: string
          iban: string
          id: string
          invoice_em: string | null
          invoice_numero: string | null
          invoice_path: string | null
          isencao_iva: string | null
          iva_cents: number
          liquido_cents: number
          motivo: string | null
          paga_em: string | null
          referencia_pagamento: string | null
          retencao_bps: number
          retencao_cents: number
          supplier_org_id: string
          titular: string
        }
        Insert: {
          cobra_iva: boolean
          comissao_cents: number
          created_at?: string
          created_by?: string | null
          estado?: string
          iban: string
          id?: string
          invoice_em?: string | null
          invoice_numero?: string | null
          invoice_path?: string | null
          isencao_iva?: string | null
          iva_cents: number
          liquido_cents: number
          motivo?: string | null
          paga_em?: string | null
          referencia_pagamento?: string | null
          retencao_bps: number
          retencao_cents: number
          supplier_org_id: string
          titular: string
        }
        Update: {
          cobra_iva?: boolean
          comissao_cents?: number
          created_at?: string
          created_by?: string | null
          estado?: string
          iban?: string
          id?: string
          invoice_em?: string | null
          invoice_numero?: string | null
          invoice_path?: string | null
          isencao_iva?: string | null
          iva_cents?: number
          liquido_cents?: number
          motivo?: string | null
          paga_em?: string | null
          referencia_pagamento?: string | null
          retencao_bps?: number
          retencao_cents?: number
          supplier_org_id?: string
          titular?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_redemptions_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_reviews: {
        Row: {
          comentario: string
          created_at: string
          created_by: string
          id: string
          nota: number
          request_survey_id: string
          vendedor_user_id: string
        }
        Insert: {
          comentario?: string
          created_at?: string
          created_by?: string
          id?: string
          nota: number
          request_survey_id: string
          vendedor_user_id: string
        }
        Update: {
          comentario?: string
          created_at?: string
          created_by?: string
          id?: string
          nota?: number
          request_survey_id?: string
          vendedor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_reviews_request_survey_id_fkey"
            columns: ["request_survey_id"]
            isOneToOne: true
            referencedRelation: "request_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_terms_acceptances: {
        Row: {
          accepted_at: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      work_requests: {
        Row: {
          building_id: string
          cor_acabamento: string | null
          created_at: string
          created_by: string
          descricao: string
          execucao_ate: string | null
          execucao_desde: string | null
          id: string
          ocupacao_via_publica: string
          org_id: string
          prazo_propostas: string | null
          produtos_preferidos: Json
          published_at: string | null
          ref: string
          status: Database["public"]["Enums"]["request_status"]
          tipo_obra: Database["public"]["Enums"]["work_type"]
          titulo: string
          trabalhos: string[]
          trabalhos_modo: string
          updated_at: string
          version: number
        }
        Insert: {
          building_id: string
          cor_acabamento?: string | null
          created_at?: string
          created_by?: string
          descricao?: string
          execucao_ate?: string | null
          execucao_desde?: string | null
          id?: string
          ocupacao_via_publica?: string
          org_id: string
          prazo_propostas?: string | null
          produtos_preferidos?: Json
          published_at?: string | null
          ref?: string
          status?: Database["public"]["Enums"]["request_status"]
          tipo_obra: Database["public"]["Enums"]["work_type"]
          titulo: string
          trabalhos?: string[]
          trabalhos_modo?: string
          updated_at?: string
          version?: number
        }
        Update: {
          building_id?: string
          cor_acabamento?: string | null
          created_at?: string
          created_by?: string
          descricao?: string
          execucao_ate?: string | null
          execucao_desde?: string | null
          id?: string
          ocupacao_via_publica?: string
          org_id?: string
          prazo_propostas?: string | null
          produtos_preferidos?: Json
          published_at?: string | null
          ref?: string
          status?: Database["public"]["Enums"]["request_status"]
          tipo_obra?: Database["public"]["Enums"]["work_type"]
          titulo?: string
          trabalhos?: string[]
          trabalhos_modo?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_requests_building_same_org"
            columns: ["building_id", "org_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "work_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_templates: {
        Row: {
          created_at: string
          created_by: string | null
          dados: Json
          id: string
          nome: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dados?: Json
          id?: string
          nome: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dados?: Json
          id?: string
          nome?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      worksite_entries: {
        Row: {
          categoria: string | null
          created_at: string
          data: string
          descricao: string
          engagement_id: string
          horas: number | null
          id: string
          meio: string | null
          member_id: string | null
          painter_org_id: string
          prevista: string | null
          recebida_em: string | null
          tipo: Database["public"]["Enums"]["worksite_entry_kind"]
          valor_cents: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data?: string
          descricao?: string
          engagement_id: string
          horas?: number | null
          id?: string
          meio?: string | null
          member_id?: string | null
          painter_org_id: string
          prevista?: string | null
          recebida_em?: string | null
          tipo: Database["public"]["Enums"]["worksite_entry_kind"]
          valor_cents?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data?: string
          descricao?: string
          engagement_id?: string
          horas?: number | null
          id?: string
          meio?: string | null
          member_id?: string | null
          painter_org_id?: string
          prevista?: string | null
          recebida_em?: string | null
          tipo?: Database["public"]["Enums"]["worksite_entry_kind"]
          valor_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "worksite_entries_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worksite_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "worksite_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worksite_entries_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      worksite_members: {
        Row: {
          ativo: boolean
          created_at: string
          custo_hora_cents: number | null
          engagement_id: string
          funcao: string
          id: string
          nome: string
          painter_org_id: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_hora_cents?: number | null
          engagement_id: string
          funcao: string
          id?: string
          nome: string
          painter_org_id: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_hora_cents?: number | null
          engagement_id?: string
          funcao?: string
          id?: string
          nome?: string
          painter_org_id?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worksite_members_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worksite_members_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      worksite_phases: {
        Row: {
          created_at: string
          engagement_id: string
          estado: string
          fim: string | null
          id: string
          inicio: string | null
          nome: string
          painter_org_id: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          estado?: string
          fim?: string | null
          id?: string
          inicio?: string | null
          nome: string
          painter_org_id: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          estado?: string
          fim?: string | null
          id?: string
          inicio?: string | null
          nome?: string
          painter_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worksite_phases_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worksite_phases_painter_org_id_fkey"
            columns: ["painter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      acc_balancete: {
        Row: {
          conta: string | null
          credito_cents: number | null
          debito_cents: number | null
          natureza: string | null
          nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acc_lines_conta_fkey"
            columns: ["conta"]
            isOneToOne: false
            referencedRelation: "acc_accounts"
            referencedColumns: ["codigo"]
          },
        ]
      }
      acc_balancete_mensal: {
        Row: {
          conta: string | null
          credito_cents: number | null
          debito_cents: number | null
          mes: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acc_lines_conta_fkey"
            columns: ["conta"]
            isOneToOne: false
            referencedRelation: "acc_accounts"
            referencedColumns: ["codigo"]
          },
        ]
      }
    }
    Functions: {
      acc_close_period: { Args: { p_mes: string }; Returns: undefined }
      acc_post: {
        Args: {
          p_data: string
          p_descricao: string
          p_lines: Json
          p_origem: string
          p_origem_id: string
        }
        Returns: string
      }
      acc_reopen_period: { Args: never; Returns: undefined }
      active_suppliers: { Args: { p_plan: string }; Returns: string[] }
      apply_referral_code: {
        Args: { p_code: string; p_proposal: string }
        Returns: string
      }
      apply_supplier_referral_code: {
        Args: { p_code: string; p_org: string }
        Returns: undefined
      }
      cancel_survey: { Args: { p_survey_id: string }; Returns: undefined }
      check_promo_code: { Args: { p_code: string }; Returns: number }
      claim_clarification: {
        Args: { p_id: string; p_org: string }
        Returns: {
          confirm_deadline: string | null
          confirmed_at: string | null
          created_at: string
          id: string
          request_survey_id: string
          respond_deadline: string | null
          respondido_em: string | null
          resposta: string | null
          status: string
          vendedor_org_id: string | null
          vendedor_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "survey_clarifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_supplier_invite: {
        Args: { p_code: string; p_org: string }
        Returns: string
      }
      clarification_batch: {
        Args: { p_clarification_id: string }
        Returns: {
          created_at: string
          texto: string
        }[]
      }
      conclude_survey: { Args: { p_survey_id: string }; Returns: undefined }
      confirm_clarification: { Args: { p_id: string }; Returns: undefined }
      delete_organization: { Args: { p_org: string }; Returns: undefined }
      painter_rating: {
        Args: { p_proposal: string }
        Returns: {
          media: number
          n: number
        }[]
      }
      rate_survey_info: {
        Args: {
          p_comentario: string
          p_nota: number
          p_request_survey_id: string
        }
        Returns: undefined
      }
      redeem_request_invite: {
        Args: { p_code: string; p_painter_org: string }
        Returns: string
      }
      referral_activity: {
        Args: { p_org: string }
        Returns: {
          amount_cents: number
          code: string
          concelho: string
          estado: string
          fee_recebido_em: string
          invoice_numero: string
          paga_em: string
          payout_id: string
          pintor: string
          proposta_estado: string
          referencia_pagamento: string
          submetida_em: string
        }[]
      }
      referral_mark_paid: {
        Args: { p_payout: string; p_ref: string }
        Returns: undefined
      }
      referral_redemption_cancel: {
        Args: { p_motivo: string; p_redemption: string }
        Returns: undefined
      }
      referral_redemption_invoice: {
        Args: { p_numero: string; p_path: string; p_redemption: string }
        Returns: undefined
      }
      referral_redemption_pay: {
        Args: { p_redemption: string; p_ref: string }
        Returns: undefined
      }
      referral_request_redemption: { Args: { p_org: string }; Returns: string }
      referral_submit_invoice: {
        Args: { p_numero: string; p_path: string; p_payout: string }
        Returns: undefined
      }
      referral_validate_regime: {
        Args: { p_bps: number; p_org: string; p_validado: boolean }
        Returns: undefined
      }
      referral_void: {
        Args: { p_motivo: string; p_payout: string }
        Returns: undefined
      }
      request_invite_info: {
        Args: { p_code: string }
        Returns: {
          concelho: string
          ja_redimido: boolean
          request_id: string
          tipo_obra: Database["public"]["Enums"]["work_type"]
        }[]
      }
      request_painter_doubt: {
        Args: { p_request_survey_id: string; p_texto: string }
        Returns: undefined
      }
      reselect_proposal: { Args: { p_proposal: string }; Returns: undefined }
      reserve_survey: {
        Args: { p_org: string; p_survey_id: string }
        Returns: {
          clarification_excluded_orgs: string[]
          concluded_at: string | null
          contact_notes: string
          created_at: string
          created_by: string
          id: string
          request_id: string
          reserve_deadline: string | null
          reserved_at: string | null
          scheduled_at: string | null
          status: string
          vendedor_org_id: string | null
          vendedor_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "request_surveys"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_listing_report: {
        Args: { p_report: string; p_resolucao: string; p_suspend: boolean }
        Returns: undefined
      }
      respond_clarification: {
        Args: { p_id: string; p_resposta: string }
        Returns: undefined
      }
      select_proposal: { Args: { p_proposal: string }; Returns: undefined }
      supplier_invite_info: {
        Args: { p_code: string }
        Returns: {
          fornecedor: string
          ja_aceite: boolean
        }[]
      }
      survey_addenda: {
        Args: { p_request_survey_id: string }
        Returns: {
          aberta_em: string
          duvidas: string[]
          estado: string
          respondido_em: string
          resposta: string
          ronda: number
        }[]
      }
      survey_preview: {
        Args: { p_survey_id: string }
        Returns: {
          concelho: string
          tipo_obra: Database["public"]["Enums"]["work_type"]
        }[]
      }
      survey_redemption_cancel: {
        Args: { p_motivo: string; p_redemption: string }
        Returns: undefined
      }
      survey_redemption_invoice: {
        Args: { p_numero: string; p_path: string; p_redemption: string }
        Returns: undefined
      }
      survey_redemption_pay: {
        Args: { p_redemption: string; p_ref: string }
        Returns: undefined
      }
      survey_request_redemption: { Args: { p_org: string }; Returns: string }
      survey_vendor_rating: {
        Args: { p_user: string }
        Returns: {
          media: number
          n: number
        }[]
      }
    }
    Enums: {
      area_source: "estimativa" | "medicao_cliente" | "planta"
      building_kind:
        | "edificio_habitacao"
        | "edificio_misto"
        | "moradia"
        | "apartamento"
        | "comercial"
      doc_kind:
        | "certidao_permanente"
        | "ata_nomeacao_administrador"
        | "ata_aprovacao_obra"
        | "alvara_impic"
        | "certificado_impic"
        | "seguro_acidentes_trabalho"
        | "seguro_responsabilidade_civil"
        | "declaracao_nao_divida_at"
        | "declaracao_nao_divida_ss"
        | "autorizacao_marca"
        | "outro"
      doc_status:
        | "submetido"
        | "em_validacao"
        | "aprovado"
        | "rejeitado"
        | "expirado"
      engagement_event_kind:
        | "deposito_confirmado"
        | "cliente_assinou"
        | "fee_recebido"
        | "pintor_assinou"
        | "cliente_desistiu"
        | "litigio_aberto"
        | "litigio_resolvido"
        | "transitar"
        | "encerrar_sem_contrato"
      line_category:
        | "preparacao"
        | "reparacao"
        | "pintura"
        | "acessos"
        | "outro"
        | "licencas"
      line_inclusion: "incluido" | "opcional" | "condicionado" | "nao_incluido"
      line_unit: "m2" | "ml" | "un" | "vg"
      member_role:
        | "proprietario"
        | "gestor"
        | "financeiro"
        | "leitor"
        | "vendedor"
      message_side: "cliente" | "pintor"
      order_status: "pedida" | "confirmada" | "entregue" | "cancelada"
      org_kind:
        | "condominio"
        | "administradora"
        | "particular"
        | "pintor"
        | "fornecedor"
      photo_kind: "geral" | "pormenor"
      photo_review: "pendente" | "aprovada" | "rejeitada"
      product_type:
        | "tinta_exterior"
        | "tinta_interior"
        | "primario"
        | "impermeabilizante"
        | "esmalte"
        | "massa_reparacao"
        | "outro"
      proposal_status:
        | "rascunho"
        | "submetida"
        | "retirada"
        | "selecionada"
        | "nao_selecionada"
        | "falhada"
      report_status: "pendente" | "suspenso" | "sem_fundamento"
      request_status: "rascunho" | "publicado" | "encerrado" | "cancelado"
      surface_kind:
        | "fachada"
        | "empena"
        | "varandas"
        | "muro"
        | "escadas_atrio"
        | "beirais_cobertura"
        | "elementos_metalicos"
        | "paredes_interiores"
        | "tetos"
        | "outro"
      work_type: "fachadas" | "zonas_comuns" | "muros" | "moradia" | "interior"
      worksite_entry_kind: "custo" | "tranche" | "horas"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      area_source: ["estimativa", "medicao_cliente", "planta"],
      building_kind: [
        "edificio_habitacao",
        "edificio_misto",
        "moradia",
        "apartamento",
        "comercial",
      ],
      doc_kind: [
        "certidao_permanente",
        "ata_nomeacao_administrador",
        "ata_aprovacao_obra",
        "alvara_impic",
        "certificado_impic",
        "seguro_acidentes_trabalho",
        "seguro_responsabilidade_civil",
        "declaracao_nao_divida_at",
        "declaracao_nao_divida_ss",
        "autorizacao_marca",
        "outro",
      ],
      doc_status: [
        "submetido",
        "em_validacao",
        "aprovado",
        "rejeitado",
        "expirado",
      ],
      engagement_event_kind: [
        "deposito_confirmado",
        "cliente_assinou",
        "fee_recebido",
        "pintor_assinou",
        "cliente_desistiu",
        "litigio_aberto",
        "litigio_resolvido",
        "transitar",
        "encerrar_sem_contrato",
      ],
      line_category: [
        "preparacao",
        "reparacao",
        "pintura",
        "acessos",
        "outro",
        "licencas",
      ],
      line_inclusion: ["incluido", "opcional", "condicionado", "nao_incluido"],
      line_unit: ["m2", "ml", "un", "vg"],
      member_role: [
        "proprietario",
        "gestor",
        "financeiro",
        "leitor",
        "vendedor",
      ],
      message_side: ["cliente", "pintor"],
      order_status: ["pedida", "confirmada", "entregue", "cancelada"],
      org_kind: [
        "condominio",
        "administradora",
        "particular",
        "pintor",
        "fornecedor",
      ],
      photo_kind: ["geral", "pormenor"],
      photo_review: ["pendente", "aprovada", "rejeitada"],
      product_type: [
        "tinta_exterior",
        "tinta_interior",
        "primario",
        "impermeabilizante",
        "esmalte",
        "massa_reparacao",
        "outro",
      ],
      proposal_status: [
        "rascunho",
        "submetida",
        "retirada",
        "selecionada",
        "nao_selecionada",
        "falhada",
      ],
      report_status: ["pendente", "suspenso", "sem_fundamento"],
      request_status: ["rascunho", "publicado", "encerrado", "cancelado"],
      surface_kind: [
        "fachada",
        "empena",
        "varandas",
        "muro",
        "escadas_atrio",
        "beirais_cobertura",
        "elementos_metalicos",
        "paredes_interiores",
        "tetos",
        "outro",
      ],
      work_type: ["fachadas", "zonas_comuns", "muros", "moradia", "interior"],
      worksite_entry_kind: ["custo", "tranche", "horas"],
    },
  },
} as const
