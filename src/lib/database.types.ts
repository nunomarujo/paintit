// Tipos da base de dados, a partir dos gerados pelo Supabase para o projeto
// "Paint it" (generate_typescript_types), compactados. Atualizar depois de cada
// migração que mude tabelas ou enums.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type BuildingKind = 'edificio_habitacao' | 'edificio_misto' | 'moradia' | 'apartamento' | 'comercial';
type DocKind =
  | 'certidao_permanente'
  | 'ata_nomeacao_administrador'
  | 'ata_aprovacao_obra'
  | 'alvara_impic'
  | 'certificado_impic'
  | 'seguro_acidentes_trabalho'
  | 'seguro_responsabilidade_civil'
  | 'declaracao_nao_divida_at'
  | 'declaracao_nao_divida_ss'
  | 'autorizacao_marca'
  | 'outro';
type DocStatus = 'submetido' | 'em_validacao' | 'aprovado' | 'rejeitado' | 'expirado';
type MemberRole = 'proprietario' | 'gestor' | 'financeiro' | 'leitor';
type OrgKind = 'condominio' | 'administradora' | 'particular' | 'pintor' | 'fornecedor';
type RequestStatus = 'rascunho' | 'publicado' | 'encerrado' | 'cancelado';
type WorkType = 'fachadas' | 'zonas_comuns' | 'muros' | 'moradia' | 'interior';
type SurfaceKind =
  | 'fachada'
  | 'empena'
  | 'varandas'
  | 'muro'
  | 'escadas_atrio'
  | 'beirais_cobertura'
  | 'elementos_metalicos'
  | 'paredes_interiores'
  | 'tetos'
  | 'outro';
type AreaSource = 'estimativa' | 'medicao_cliente' | 'planta';
type PhotoKind = 'geral' | 'pormenor';
type PhotoReview = 'pendente' | 'aprovada' | 'rejeitada';
type ViaPublica = 'sim' | 'nao' | 'a_avaliar';
type ProposalStatus = 'rascunho' | 'submetida' | 'retirada' | 'selecionada' | 'nao_selecionada' | 'falhada';
type EngagementEventKind =
  | 'deposito_confirmado'
  | 'cliente_assinou'
  | 'fee_recebido'
  | 'pintor_assinou'
  | 'cliente_desistiu'
  | 'litigio_aberto'
  | 'litigio_resolvido'
  | 'transitar'
  | 'encerrar_sem_contrato';
type LineCategory = 'preparacao' | 'reparacao' | 'pintura' | 'acessos' | 'licencas' | 'outro';
type LineUnit = 'm2' | 'ml' | 'un' | 'vg';
type LineInclusion = 'incluido' | 'opcional' | 'condicionado' | 'nao_incluido';
type MessageSide = 'cliente' | 'pintor';
type ReportStatus = 'pendente' | 'suspenso' | 'sem_fundamento';
type OrderStatus = 'pedida' | 'confirmada' | 'entregue' | 'cancelada';
type WorksiteEntryKind = 'custo' | 'tranche' | 'horas';
type ProductType =
  | 'tinta_exterior'
  | 'tinta_interior'
  | 'primario'
  | 'impermeabilizante'
  | 'esmalte'
  | 'massa_reparacao'
  | 'outro';

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' };
  public: {
    Tables: {
      buildings: {
        Row: {
          acessos: string | null;
          ano_construcao: number | null;
          artigo_matricial: string | null;
          codigo_postal: string;
          concelho: string;
          created_at: string;
          created_by: string;
          fachadas: number | null;
          fracoes: number | null;
          id: string;
          localidade: string;
          morada: string;
          nome_interno: string;
          org_id: string;
          pisos: number | null;
          tem_elevador: boolean;
          tem_varandas: boolean;
          tipo: BuildingKind;
          updated_at: string;
        };
        Insert: {
          acessos?: string | null;
          ano_construcao?: number | null;
          artigo_matricial?: string | null;
          codigo_postal: string;
          concelho: string;
          created_at?: string;
          created_by?: string;
          fachadas?: number | null;
          fracoes?: number | null;
          id?: string;
          localidade: string;
          morada: string;
          nome_interno: string;
          org_id: string;
          pisos?: number | null;
          tem_elevador?: boolean;
          tem_varandas?: boolean;
          tipo: BuildingKind;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['buildings']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'buildings_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      org_documents: {
        Row: {
          building_id: string | null;
          created_at: string;
          id: string;
          kind: DocKind;
          nome_ficheiro: string;
          notas_validacao: string | null;
          org_id: string;
          status: DocStatus;
          storage_path: string;
          submitted_by: string;
          validated_at: string | null;
          validated_by: string | null;
          valido_ate: string | null;
          classe: number | null;
        };
        Insert: {
          building_id?: string | null;
          created_at?: string;
          id?: string;
          kind: DocKind;
          nome_ficheiro: string;
          notas_validacao?: string | null;
          org_id: string;
          status?: DocStatus;
          storage_path: string;
          submitted_by?: string;
          validated_at?: string | null;
          validated_by?: string | null;
          valido_ate?: string | null;
          classe?: number | null;
        };
        Update: Partial<Database['public']['Tables']['org_documents']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'org_documents_building_same_org';
            columns: ['building_id', 'org_id'];
            isOneToOne: false;
            referencedRelation: 'buildings';
            referencedColumns: ['id', 'org_id'];
          },
          {
            foreignKeyName: 'org_documents_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      org_members: {
        Row: { created_at: string; org_id: string; role: MemberRole; user_id: string };
        Insert: { created_at?: string; org_id: string; role: MemberRole; user_id: string };
        Update: { created_at?: string; org_id?: string; role?: MemberRole; user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'org_members_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          atendimento_publico: string | null;
          codigo_postal: string | null;
          created_at: string;
          created_by: string;
          email_contacto: string | null;
          gerida_por: string | null;
          id: string;
          kind: OrgKind;
          localidade: string | null;
          morada_fiscal: string | null;
          nif: string | null;
          nome: string;
          telefone: string | null;
          updated_at: string;
          zonas_servico: string[];
        };
        Insert: {
          atendimento_publico?: string | null;
          codigo_postal?: string | null;
          created_at?: string;
          created_by?: string;
          email_contacto?: string | null;
          gerida_por?: string | null;
          id?: string;
          kind: OrgKind;
          localidade?: string | null;
          morada_fiscal?: string | null;
          nif?: string | null;
          nome: string;
          telefone?: string | null;
          updated_at?: string;
          zonas_servico?: string[];
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'organizations_gerida_por_fkey';
            columns: ['gerida_por'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      org_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          org_id: string;
          org_kind: OrgKind | null;
          org_nome: string | null;
          role: MemberRole;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          org_id: string;
          role: MemberRole;
        };
        Update: Partial<Database['public']['Tables']['org_invitations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'org_invitations_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      work_requests: {
        Row: {
          produtos_preferidos: Json;
          building_id: string;
          cor_acabamento: string | null;
          created_at: string;
          created_by: string;
          descricao: string;
          execucao_ate: string | null;
          execucao_desde: string | null;
          id: string;
          org_id: string;
          prazo_propostas: string | null;
          published_at: string | null;
          ref: string;
          status: RequestStatus;
          tipo_obra: WorkType;
          titulo: string;
          trabalhos: string[];
          updated_at: string;
          version: number;
          ocupacao_via_publica: ViaPublica;
          trabalhos_modo: string;
        };
        Insert: {
          produtos_preferidos?: Json;
          building_id: string;
          cor_acabamento?: string | null;
          created_at?: string;
          created_by?: string;
          descricao?: string;
          execucao_ate?: string | null;
          execucao_desde?: string | null;
          id?: string;
          org_id: string;
          prazo_propostas?: string | null;
          published_at?: string | null;
          ref?: string;
          status?: RequestStatus;
          tipo_obra: WorkType;
          titulo: string;
          trabalhos?: string[];
          updated_at?: string;
          version?: number;
          ocupacao_via_publica?: ViaPublica;
          trabalhos_modo?: string;
        };
        Update: Partial<Database['public']['Tables']['work_requests']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'work_requests_org_id_fkey';
            columns: ['org_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_requests_building_same_org';
            columns: ['building_id', 'org_id'];
            isOneToOne: false;
            referencedRelation: 'buildings';
            referencedColumns: ['id', 'org_id'];
          },
        ];
      };
      engagements: {
        Row: {
          advance_cents: number;
          base_cents: number;
          carried_from: string | null;
          client_org_id: string;
          created_at: string;
          id: string;
          painter_org_id: string;
          proposal_id: string;
          referral_discount_bp: number;
          request_id: string;
          rules_version: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      engagement_events: {
        Row: {
          actor: string;
          amount_cents: number | null;
          at: string;
          created_at: string;
          engagement_id: string;
          id: string;
          kind: EngagementEventKind;
          payload: Json;
          reveal: boolean;
        };
        Insert: {
          actor?: string;
          amount_cents?: number | null;
          at?: string;
          engagement_id: string;
          kind: EngagementEventKind;
          payload?: Json;
          reveal?: boolean;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'engagement_events_engagement_id_fkey';
            columns: ['engagement_id'];
            isOneToOne: false;
            referencedRelation: 'engagements';
            referencedColumns: ['id'];
          },
        ];
      };
      listing_reports: {
        Row: {
          created_at: string;
          id: string;
          motivo: string;
          reporter: string;
          request_id: string;
          resolucao: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: ReportStatus;
        };
        Insert: {
          motivo: string;
          reporter?: string;
          request_id: string;
        };
        Update: never;
        Relationships: [];
      };
      products: {
        Row: {
          reference_product_id: string | null;
          ativo: boolean;
          created_at: string;
          created_by: string;
          embalagem_ml: number | null;
          ficha_path: string | null;
          id: string;
          marca: string;
          nome: string;
          org_id: string;
          preco_data: string | null;
          preco_referencia_cents: number | null;
          referencia: string | null;
          rendimento: number | null;
          tipo: ProductType;
          updated_at: string;
          unidade: 'L' | 'kg';
          descricao: string | null;
          modos_aplicacao: string[];
          acabamento: string | null;
          uso: string | null;
          base: string | null;
          secagem_horas: number | null;
          diluicao: string | null;
          demaos_recomendadas: number | null;
          preco_fornecedor_cents: number | null;
        };
        Insert: {
          reference_product_id?: string | null;
          ativo?: boolean;
          created_by?: string;
          embalagem_ml?: number | null;
          ficha_path?: string | null;
          id?: string;
          marca: string;
          nome: string;
          org_id: string;
          preco_data?: string | null;
          preco_referencia_cents?: number | null;
          referencia?: string | null;
          rendimento?: number | null;
          tipo: ProductType;
          unidade?: 'L' | 'kg';
          descricao?: string | null;
          modos_aplicacao?: string[];
          acabamento?: string | null;
          uso?: string | null;
          base?: string | null;
          secagem_horas?: number | null;
          diluicao?: string | null;
          demaos_recomendadas?: number | null;
          preco_fornecedor_cents?: number | null;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      proposal_versions: {
        Row: { id: string; proposal_id: string; snapshot: Json; submitted_at: string; version: number };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      listing_invites: {
        Row: { created_at: string; id: string; invited_by: string; painter_org_id: string; request_id: string };
        Insert: { invited_by?: string; painter_org_id: string; request_id: string };
        Update: never;
        Relationships: [];
      };
      reviews: {
        Row: {
          comentario: string;
          comunicacao: number;
          created_at: string;
          created_by: string;
          engagement_id: string;
          id: string;
          painter_org_id: string;
          prazo: number;
          qualidade: number;
          resposta: string | null;
          resposta_at: string | null;
          updated_at: string;
        };
        Insert: {
          comentario?: string;
          comunicacao: number;
          created_by?: string;
          engagement_id: string;
          prazo: number;
          qualidade: number;
        };
        Update: { comentario?: string; comunicacao?: number; prazo?: number; qualidade?: number; resposta?: string | null };
        Relationships: [];
      };
      notifications: {
        Row: { created_at: string; id: string; lida_em: string | null; link: string; org_id: string; texto: string };
        Insert: never;
        Update: { lida_em?: string | null };
        Relationships: [];
      };
      supplier_discounts: {
        Row: {
          created_at: string;
          created_by: string;
          desconto_bps: number;
          id: string;
          max_area_cm2: number | null;
          min_area_cm2: number | null;
          org_id: string;
          painter_org_id: string | null;
          pagamento: 'pronto' | 'diferido' | null;
          min_quantidade: number | null;
          perfil: 'primeira_compra' | 'cliente_frequente' | null;
          product_id: string | null;
          tipo: ProductType | null;
          valido_ate: string | null;
        };
        Insert: {
          created_by?: string;
          desconto_bps: number;
          max_area_cm2?: number | null;
          min_area_cm2?: number | null;
          org_id: string;
          painter_org_id?: string | null;
          pagamento?: 'pronto' | 'diferido' | null;
          min_quantidade?: number | null;
          perfil?: 'primeira_compra' | 'cliente_frequente' | null;
          product_id?: string | null;
          tipo?: ProductType | null;
          valido_ate?: string | null;
        };
        Update: Partial<Database['public']['Tables']['supplier_discounts']['Insert']>;
        Relationships: [];
      };
      reference_products: {
        Row: {
          acabamento: string | null; base_aquosa: boolean | null; complementares: string[]; cores: string | null; created_at: string;
          demaos: string | null; descricao: string | null; diluicao: string | null; embalagens_l: number[]; foto_path: string | null;
          id: string; marca: string; nome: string; nota: string | null; preco_data: string | null; preco_embalagem_l: number | null;
          preco_fonte: string | null; preco_referencia_cents: number | null; rendimento_m2_l: number | null; secagem_horas: number | null;
          tipo: ProductType; url_ficha_tecnica: string | null; url_produto: string | null; uso: string | null;
        };
        Insert: { marca: string; nome: string; tipo: ProductType; [k: string]: unknown };
        Update: { [k: string]: unknown };
        Relationships: [];
      };
      contact_violations: {
        Row: { anulada_em: string | null; created_at: string; id: string; motivos: string[]; onde: string; texto: string; user_id: string };
        Insert: { anulada_em?: string | null; created_at?: string; id?: string; motivos: string[]; onde: string; texto: string; user_id: string };
        Update: Partial<Database['public']['Tables']['contact_violations']['Insert']>;
        Relationships: [];
      };
      strike_appeals: {
        Row: { created_at: string; decided_at: string | null; decided_by: string | null; decisao: string | null; estado: 'pendente' | 'aceite' | 'recusada'; id: string; texto: string; user_id: string; violation_id: string };
        Insert: { created_at?: string; decided_at?: string | null; decided_by?: string | null; decisao?: string | null; estado?: 'pendente' | 'aceite' | 'recusada'; id?: string; texto: string; user_id: string; violation_id: string };
        Update: Partial<Database['public']['Tables']['strike_appeals']['Insert']>;
        Relationships: [];
      };
      referral_codes: {
        Row: { active: boolean; code: string; created_at: string; created_by: string | null; id: string; max_wins: number; nota: string | null; painter_org_id: string | null; supplier_org_id: string };
        Insert: { active?: boolean; code: string; created_at?: string; created_by?: string | null; id?: string; max_wins?: number; nota?: string | null; painter_org_id?: string | null; supplier_org_id: string };
        Update: { active?: boolean; nota?: string | null };
        Relationships: [];
      };
      supplier_referral_invites: {
        Row: {
          active: boolean;
          adesao_elegivel_em: string | null;
          code: string;
          convite_confirmado_em: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          nif: string | null;
          nota: string | null;
          painter_org_id: string;
          supplier_org_id: string | null;
        };
        Insert: { active?: boolean; code: string; created_at?: string; created_by?: string | null; id?: string; nota?: string | null; painter_org_id: string };
        Update: { active?: boolean; nota?: string | null };
        Relationships: [
          { foreignKeyName: 'supplier_referral_invites_supplier_org_id_fkey'; columns: ['supplier_org_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] },
        ];
      };
      supplier_payout_details: {
        Row: { cobra_iva: boolean; declaracao_retencao: 'nao_sujeito' | 'sujeito' | 'dispensa' | null; iban: string; isencao_iva: string | null; org_id: string; regime_validado: boolean; retencao_bps: number; titular: string; updated_at: string };
        Insert: { cobra_iva?: boolean; declaracao_retencao?: 'nao_sujeito' | 'sujeito' | 'dispensa' | null; iban: string; isencao_iva?: string | null; org_id: string; titular: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['supplier_payout_details']['Insert']>;
        Relationships: [];
      };
      referral_payouts: {
        Row: {
          amount_cents: number;
          code_id: string;
          created_at: string;
          engagement_id: string;
          estado: 'adjudicada' | 'fatura_recebida' | 'paga' | 'sem_efeito';
          fee_avisado: boolean;
          fee_recebido_em: string | null;
          id: string;
          invoice_em: string | null;
          invoice_numero: string | null;
          invoice_path: string | null;
          motivo: string | null;
          paga_em: string | null;
          proposal_id: string;
          redemption_id: string | null;
          referencia_pagamento: string | null;
          supplier_org_id: string;
        };
        Insert: never;
        Update: { fee_avisado?: boolean };
        Relationships: [];
      };
      referral_redemptions: {
        Row: {
          cobra_iva: boolean;
          comissao_cents: number;
          created_at: string;
          created_by: string | null;
          estado: 'pedido' | 'fatura_recebida' | 'paga' | 'anulado';
          iban: string;
          id: string;
          invoice_em: string | null;
          invoice_numero: string | null;
          invoice_path: string | null;
          isencao_iva: string | null;
          iva_cents: number;
          liquido_cents: number;
          motivo: string | null;
          paga_em: string | null;
          referencia_pagamento: string | null;
          retencao_bps: number;
          retencao_cents: number;
          supplier_org_id: string;
          titular: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      acc_accounts: {
        Row: { ativa: boolean; codigo: string; natureza: 'devedora' | 'credora'; nome: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      acc_periods: {
        Row: { atualizado_em: string; atualizado_por: string | null; fechado: boolean; mes: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      acc_period_log: {
        Row: { acao: 'fechar' | 'reabrir'; em: string; id: string; mes: string; por: string | null };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      acc_entries: {
        Row: { created_at: string; data: string; descricao: string; id: string; origem: string; origem_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      acc_lines: {
        Row: { conta: string; credito_cents: number; debito_cents: number; entry_id: string; id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      subscription_payments: {
        Row: { amount_cents: number; created_at: string; id: string; org_id: string | null; paid_at: string; stripe_invoice_id: string; vat_cents: number | null };
        Insert: { amount_cents: number; org_id?: string | null; paid_at?: string; stripe_invoice_id: string; vat_cents?: number | null };
        Update: never;
        Relationships: [];
      };
      stripe_bt: {
        Row: {
          amount_cents: number;
          available_on: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          fee_cents: number;
          id: string;
          invoice_id: string | null;
          net_cents: number;
          payment_intent: string | null;
          reporting_category: string;
          source_id: string | null;
          synced_at: string;
          type: string;
        };
        Insert: {
          amount_cents: number;
          available_on?: string | null;
          created_at: string;
          currency: string;
          description?: string | null;
          fee_cents?: number;
          id: string;
          invoice_id?: string | null;
          net_cents: number;
          payment_intent?: string | null;
          reporting_category: string;
          source_id?: string | null;
          type: string;
        };
        Update: Partial<Database['public']['Tables']['stripe_bt']['Insert']>;
        Relationships: [];
      };
      stripe_payouts: {
        Row: { amount_cents: number; arrival_at: string | null; created_at: string; currency: string; id: string; status: string; synced_at: string };
        Insert: { amount_cents: number; arrival_at?: string | null; created_at: string; currency: string; id: string; status: string };
        Update: Partial<Database['public']['Tables']['stripe_payouts']['Insert']>;
        Relationships: [];
      };
      stripe_balance_snapshots: {
        Row: { available_cents: number; currency: string; id: string; pending_cents: number; taken_at: string };
        Insert: { available_cents: number; currency: string; pending_cents: number };
        Update: never;
        Relationships: [];
      };
      bank_imports: {
        Row: { created_at: string; created_by: string | null; de: string | null; ate: string | null; duplicadas: number; ficheiro: string; formato: 'csv' | 'camt053'; iban: string | null; id: string; linhas: number; novas: number };
        Insert: { de?: string | null; ate?: string | null; duplicadas: number; ficheiro: string; formato: 'csv' | 'camt053'; iban?: string | null; id?: string; linhas: number; novas: number };
        Update: never;
        Relationships: [];
      };
      bank_lines: {
        Row: {
          automatica: boolean;
          chave: string;
          classificacao: 'por_classificar' | 'stripe_payout' | 'resgate' | 'outro' | 'ignorada';
          classificada_em: string | null;
          classificada_por: string | null;
          created_at: string;
          data: string;
          data_valor: string | null;
          descricao: string;
          id: string;
          import_id: string;
          notas: string | null;
          redemption_id: string | null;
          saldo_cents: number | null;
          stripe_payout_id: string | null;
          valor_cents: number;
        };
        Insert: { chave: string; data: string; data_valor?: string | null; descricao: string; id?: string; import_id: string; saldo_cents?: number | null; valor_cents: number };
        Update: {
          automatica?: boolean;
          classificacao?: 'por_classificar' | 'stripe_payout' | 'resgate' | 'outro' | 'ignorada';
          notas?: string | null;
          redemption_id?: string | null;
          stripe_payout_id?: string | null;
        };
        Relationships: [];
      };
      stripe_bt_review: {
        Row: { bt_id: string; em: string; nota: string; por: string | null };
        Insert: { bt_id: string; nota: string };
        Update: never;
        Relationships: [];
      };
      fiscal_documents: {
        Row: {
          atcud: string | null;
          cliente_nif: string | null;
          cliente_nome: string;
          created_at: string;
          data: string;
          emitido_em: string | null;
          erro: string | null;
          estado: 'pendente' | 'emitido' | 'falhou';
          id: string;
          numero: string | null;
          origin_id: string;
          origin_type: string;
          pdf_path: string | null;
          provider: string;
          provider_document_id: string | null;
          reason: 'comissao' | 'subscricao' | 'caucao_retida';
          referencia_origin_id: string | null;
          referencia_origin_type: string | null;
          tipo: 'FT' | 'NC';
          total_cents: number;
        };
        Insert: {
          atcud?: string | null;
          cliente_nif?: string | null;
          cliente_nome: string;
          data: string;
          emitido_em?: string | null;
          erro?: string | null;
          estado?: 'pendente' | 'emitido' | 'falhou';
          id?: string;
          numero?: string | null;
          origin_id: string;
          origin_type: string;
          pdf_path?: string | null;
          provider?: string;
          provider_document_id?: string | null;
          reason: 'comissao' | 'subscricao' | 'caucao_retida';
          referencia_origin_id?: string | null;
          referencia_origin_type?: string | null;
          tipo: 'FT' | 'NC';
          total_cents: number;
        };
        Update: Partial<Database['public']['Tables']['fiscal_documents']['Insert']>;
        Relationships: [];
      };
      moloni_token: {
        Row: { access_token: string; expires_at: string; id: boolean; refresh_token: string; updated_at: string };
        Insert: { access_token: string; expires_at: string; id?: boolean; refresh_token: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['moloni_token']['Insert']>;
        Relationships: [];
      };
      work_templates: {
        Row: { created_at: string; created_by: string | null; dados: Json; id: string; nome: string; org_id: string; updated_at: string };
        Insert: { created_at?: string; created_by?: string | null; dados?: Json; id?: string; nome: string; org_id: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['work_templates']['Insert']>;
        Relationships: [];
      };
      blocked_users: {
        Row: { blocked_at: string; motivo: string; user_id: string };
        Insert: { blocked_at?: string; motivo: string; user_id: string };
        Update: Partial<Database['public']['Tables']['blocked_users']['Insert']>;
        Relationships: [];
      };
      blocked_identifiers: {
        Row: { created_at: string; nif: string; user_id: string | null };
        Insert: { created_at?: string; nif: string; user_id?: string | null };
        Update: Partial<Database['public']['Tables']['blocked_identifiers']['Insert']>;
        Relationships: [];
      };
      stripe_payments: {
        Row: { amount_cents: number; created_at: string; engagement_id: string; id: string; kind: string; payment_intent: string; refunded_cents: number };
        Insert: { amount_cents: number; created_at?: string; engagement_id: string; id?: string; kind: string; payment_intent: string; refunded_cents?: number };
        Update: Partial<Database['public']['Tables']['stripe_payments']['Insert']>;
        Relationships: [];
      };
      supplier_subscriptions: {
        Row: { discount_bps: number; org_id: string; plan: 'vendedores' | 'catalogo'; price_cents: number; promo_code_id: string | null; started_at: string; status: 'ativa' | 'suspensa' | 'cancelada'; stripe_subscription_id: string | null; updated_at: string; updated_by: string | null };
        Insert: { discount_bps?: number; org_id: string; plan: 'vendedores' | 'catalogo'; price_cents: number; promo_code_id?: string | null; started_at?: string; status?: 'ativa' | 'suspensa' | 'cancelada'; stripe_subscription_id?: string | null; updated_at?: string; updated_by?: string | null };
        Update: Partial<Database['public']['Tables']['supplier_subscriptions']['Insert']>;
        Relationships: [];
      };
      supplier_delivery: {
        Row: {
          concelhos: string[];
          condicoes: string;
          created_at: string;
          custo_cents: number | null;
          id: string;
          incluida: boolean;
          minimo_cents: number | null;
          org_id: string;
        };
        Insert: {
          concelhos?: string[];
          condicoes?: string;
          custo_cents?: number | null;
          incluida?: boolean;
          minimo_cents?: number | null;
          org_id: string;
        };
        Update: Partial<Database['public']['Tables']['supplier_delivery']['Insert']>;
        Relationships: [];
      };
      material_orders: {
        Row: {
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          created_by: string;
          delivered_at: string | null;
          embalagens: number;
          engagement_id: string;
          estado: OrderStatus;
          id: string;
          nota: string | null;
          painter_org_id: string;
          product_id: string;
          supplier_org_id: string;
        };
        Insert: {
          created_by?: string;
          embalagens: number;
          engagement_id: string;
          nota?: string | null;
          product_id: string;
        };
        Update: { estado?: OrderStatus };
        Relationships: [
          {
            foreignKeyName: 'material_orders_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      supplier_reviews: {
        Row: {
          atendimento: number;
          comentario: string;
          created_at: string;
          created_by: string;
          entrega: number;
          id: string;
          painter_org_id: string;
          produto: number;
          supplier_org_id: string;
          updated_at: string;
        };
        Insert: {
          atendimento: number;
          comentario?: string;
          created_by?: string;
          entrega: number;
          painter_org_id: string;
          produto: number;
          supplier_org_id: string;
        };
        Update: { atendimento?: number; comentario?: string; entrega?: number; produto?: number };
        Relationships: [];
      };
      worksite_members: {
        Row: {
          ativo: boolean;
          created_at: string;
          custo_hora_cents: number | null;
          engagement_id: string;
          funcao: string;
          id: string;
          nome: string;
          painter_org_id: string;
          telefone: string | null;
        };
        Insert: {
          ativo?: boolean;
          custo_hora_cents?: number | null;
          engagement_id: string;
          funcao: string;
          nome: string;
          painter_org_id?: string;
          telefone?: string | null;
        };
        Update: { ativo?: boolean; custo_hora_cents?: number | null; funcao?: string; nome?: string; telefone?: string | null };
        Relationships: [];
      };
      worksite_phases: {
        Row: {
          created_at: string;
          engagement_id: string;
          estado: string;
          fim: string | null;
          id: string;
          inicio: string | null;
          nome: string;
          painter_org_id: string;
        };
        Insert: { engagement_id: string; estado?: string; fim?: string | null; inicio?: string | null; nome: string; painter_org_id?: string };
        Update: { estado?: string; fim?: string | null; inicio?: string | null; nome?: string };
        Relationships: [];
      };
      worksite_entries: {
        Row: {
          categoria: string | null;
          created_at: string;
          data: string;
          descricao: string;
          engagement_id: string;
          horas: number | null;
          id: string;
          meio: string | null;
          member_id: string | null;
          painter_org_id: string;
          prevista: string | null;
          recebida_em: string | null;
          tipo: WorksiteEntryKind;
          valor_cents: number | null;
        };
        Insert: {
          categoria?: string | null;
          data?: string;
          descricao?: string;
          engagement_id: string;
          horas?: number | null;
          meio?: string | null;
          member_id?: string | null;
          painter_org_id?: string;
          prevista?: string | null;
          recebida_em?: string | null;
          tipo: WorksiteEntryKind;
          valor_cents?: number | null;
        };
        Update: { recebida_em?: string | null; meio?: string | null };
        Relationships: [];
      };
      proposals: {
        Row: {
          adiantamento_bps: number;
          base_cents: number | null;
          created_at: string;
          created_by: string;
          duracao_dias: number | null;
          exclusoes: string;
          garantia_anos: number | null;
          id: string;
          inicio_possivel: string | null;
          iva_bps: number;
          iva_cents: number | null;
          notas: string;
          painter_org_id: string;
          pintor_verificado: boolean | null;
          preco_ajuste_m2_cents: number | null;
          request_id: string;
          request_version: number | null;
          selected_at: string | null;
          status: ProposalStatus;
          submitted_at: string | null;
          updated_at: string;
          validade: string | null;
          version: number;
          habilitacao_ok: boolean | null;
          fases: Json;
          confirma_mao_obra: boolean;
          referral_code_id: string | null;
          seguro_rc: string | null;
          seguro_at: string | null;
          modo_preco: string;
        };
        Insert: {
          adiantamento_bps?: number;
          created_by?: string;
          duracao_dias?: number | null;
          exclusoes?: string;
          garantia_anos?: number | null;
          id?: string;
          inicio_possivel?: string | null;
          iva_bps?: number;
          notas?: string;
          painter_org_id: string;
          preco_ajuste_m2_cents?: number | null;
          request_id: string;
          status?: ProposalStatus;
          validade?: string | null;
          fases?: Json;
          confirma_mao_obra?: boolean;
          seguro_rc?: string | null;
          seguro_at?: string | null;
          modo_preco?: string;
        };
        Update: Partial<Database['public']['Tables']['proposals']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'proposals_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'work_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      proposal_lines: {
        Row: {
          categoria: LineCategory;
          created_at: string;
          demaos: number | null;
          descricao: string;
          id: string;
          inclusao: LineInclusion;
          preco_unitario_cents: number;
          produto: string | null;
          proposal_id: string;
          quantidade: number;
          superficie: SurfaceKind | null;
          total_cents: number;
          unidade: LineUnit;
          product_id: string | null;
          preco_fornecedor_cents: number | null;
          desconto_bps: number | null;
          surface_ids: string[];
          motivo_diferenca: string | null;
          trabalho: string | null;
          detalhes: Json;
        };
        Insert: {
          categoria: LineCategory;
          demaos?: number | null;
          descricao: string;
          id?: string;
          inclusao?: LineInclusion;
          preco_unitario_cents: number;
          produto?: string | null;
          proposal_id: string;
          quantidade: number;
          superficie?: SurfaceKind | null;
          unidade?: LineUnit;
          product_id?: string | null;
          preco_fornecedor_cents?: number | null;
          desconto_bps?: number | null;
          surface_ids?: string[];
          motivo_diferenca?: string | null;
          trabalho?: string | null;
          detalhes?: Json;
        };
        Update: Partial<Database['public']['Tables']['proposal_lines']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'proposal_lines_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
        ];
      };
      proposal_messages: {
        Row: {
          autor: string;
          created_at: string;
          id: string;
          lado: MessageSide;
          proposal_id: string;
          request_id: string;
          texto: string;
        };
        Insert: {
          autor?: string;
          id?: string;
          lado: MessageSide;
          proposal_id: string;
          texto: string;
        };
        Update: Partial<Database['public']['Tables']['proposal_messages']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'proposal_messages_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'proposals';
            referencedColumns: ['id'];
          },
        ];
      };
      request_photos: {
        Row: {
          created_at: string;
          id: string;
          kind: PhotoKind;
          legenda: string | null;
          notas_revisao: string | null;
          request_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          revisao: PhotoReview | null;
          storage_path: string;
          submitted_by: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: PhotoKind;
          legenda?: string | null;
          notas_revisao?: string | null;
          request_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          revisao?: PhotoReview | null;
          storage_path: string;
          submitted_by?: string;
        };
        Update: Partial<Database['public']['Tables']['request_photos']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'request_photos_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'work_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      request_surfaces: {
        Row: {
          altura_cm: number | null;
          area_cm2: number;
          area_direta_cm2: number | null;
          created_at: string;
          descricao: string | null;
          id: string;
          kind: SurfaceKind;
          largura_cm: number | null;
          origem: AreaSource;
          quantidade: number;
          request_id: string;
          vaos_cm2: number | null;
          trabalhos: string[] | null;
        };
        Insert: {
          altura_cm?: number | null;
          area_direta_cm2?: number | null;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          kind: SurfaceKind;
          largura_cm?: number | null;
          origem?: AreaSource;
          quantidade?: number;
          request_id: string;
          vaos_cm2?: number | null;
          trabalhos?: string[] | null;
        };
        Update: Partial<Database['public']['Tables']['request_surfaces']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'request_surfaces_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'work_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      request_listings: {
        Row: {
          produtos_preferidos: Json;
          aberto: boolean;
          area_total_cm2: number;
          concelho: string;
          cor_acabamento: string | null;
          descricao: string;
          execucao_ate: string | null;
          execucao_desde: string | null;
          fachadas: number | null;
          pisos: number | null;
          prazo_propostas: string;
          published_at: string;
          ref: string;
          request_id: string;
          tem_varandas: boolean;
          tipo_imovel: BuildingKind;
          tipo_obra: WorkType;
          trabalhos: string[];
          version: number;
          ocupacao_via_publica: ViaPublica;
          trabalhos_modo: string;
        };
        // Escrita só pelo gatilho de publicação (a base de dados recusa o resto).
        Insert: Partial<Database['public']['Tables']['request_listings']['Row']>;
        Update: Partial<Database['public']['Tables']['request_listings']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'request_listings_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: true;
            referencedRelation: 'work_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      promo_codes: {
        Row: { active: boolean; code: string; created_at: string; created_by: string; discount_bps: number; id: string; max_uses: number | null; notas: string | null; uses: number; valid_until: string | null };
        Insert: {
          active?: boolean; code: string; created_at?: string; created_by?: string; discount_bps: number; id?: string; max_uses?: number | null; notas?: string | null; uses?: number; valid_until?: string | null };
        Update: { active?: boolean; code?: string; created_at?: string; created_by?: string; discount_bps?: number; id?: string; max_uses?: number | null; notas?: string | null; uses?: number; valid_until?: string | null };
        Relationships: [];
      };
      platform_admins: {
        Row: { created_at: string; user_id: string };
        Insert: { created_at?: string; user_id: string };
        Update: { created_at?: string; user_id?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          nome: string;
          telefone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          nome?: string;
          telefone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          nome?: string;
          telefone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      acc_balancete: { Row: { conta: string; credito_cents: number; debito_cents: number; natureza: 'devedora' | 'credora'; nome: string }; Relationships: [] };
      acc_balancete_mensal: { Row: { conta: string; credito_cents: number; debito_cents: number; mes: string }; Relationships: [] };
    };
    Functions: {
      apply_referral_code: { Args: { p_proposal: string; p_code: string | null }; Returns: string | null };
      apply_supplier_referral_code: { Args: { p_org: string; p_code: string | null }; Returns: undefined };
      referral_submit_invoice: { Args: { p_payout: string; p_numero: string; p_path: string }; Returns: undefined };
      referral_activity: {
        Args: { p_org: string };
        Returns: {
          code: string;
          pintor: string;
          concelho: string | null;
          proposta_estado: string;
          submetida_em: string | null;
          payout_id: string | null;
          amount_cents: number | null;
          estado: 'adjudicada' | 'fatura_recebida' | 'paga' | 'sem_efeito' | null;
          fee_recebido_em: string | null;
          invoice_numero: string | null;
          paga_em: string | null;
          referencia_pagamento: string | null;
        }[];
      };
      referral_mark_paid: { Args: { p_payout: string; p_ref: string }; Returns: undefined };
      referral_void: { Args: { p_payout: string; p_motivo: string }; Returns: undefined };
      acc_post: { Args: { p_data: string; p_descricao: string; p_origem: string; p_origem_id: string; p_lines: Json }; Returns: string };
      acc_close_period: { Args: { p_mes: string }; Returns: undefined };
      acc_reopen_period: { Args: Record<string, never>; Returns: undefined };
      referral_request_redemption: { Args: { p_org: string }; Returns: string };
      referral_redemption_invoice: { Args: { p_redemption: string; p_numero: string; p_path: string }; Returns: undefined };
      referral_redemption_cancel: { Args: { p_redemption: string; p_motivo: string }; Returns: undefined };
      referral_redemption_pay: { Args: { p_redemption: string; p_ref: string }; Returns: undefined };
      referral_validate_regime: { Args: { p_org: string; p_bps: number; p_validado: boolean }; Returns: undefined };
      select_proposal: { Args: { p_proposal: string }; Returns: undefined };
      reselect_proposal: { Args: { p_proposal: string }; Returns: undefined };
      active_suppliers: { Args: { p_plan: string }; Returns: string[] };
      delete_organization: { Args: { p_org: string }; Returns: undefined };
      check_promo_code: { Args: { p_code: string }; Returns: number | null };
      painter_rating: { Args: { p_proposal: string }; Returns: { n: number; media: number | null }[] };
      resolve_listing_report: { Args: { p_report: string; p_suspend: boolean; p_resolucao: string }; Returns: undefined };
    };
    Enums: {
      building_kind: BuildingKind;
      doc_kind: DocKind;
      doc_status: DocStatus;
      member_role: MemberRole;
      org_kind: OrgKind;
      request_status: RequestStatus;
      work_type: WorkType;
      surface_kind: SurfaceKind;
      area_source: AreaSource;
      photo_kind: PhotoKind;
      photo_review: PhotoReview;
      proposal_status: ProposalStatus;
      line_category: LineCategory;
      line_unit: LineUnit;
      line_inclusion: LineInclusion;
      message_side: MessageSide;
      engagement_event_kind: EngagementEventKind;
      report_status: ReportStatus;
      product_type: ProductType;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
