// NOTA (24/10/2026): este ficheiro é mantido à mão e está atrasado em relação à base real. A
// regeneração completa traz ~4000 linhas de diferença e revela 45 erros de tipos em 19 ficheiros
// (colunas de vistas que podem ser nulas, enums, inserções a que falta uma coluna obrigatória). É
// dívida a saldar de propósito, com tempo — ver docs/ESTADO.md. `forma_implantacao` foi acrescentada
// aqui à mão, nas duas tabelas onde existe, e o mesmo se fez a 30/10/2026 com as três dimensões da
// zona em `request_surfaces` (participacao, origem_quantidade, confirmacao, registado_por,
// registado_em, observacoes): a regeneração completa dá hoje 87 erros em 19 ficheiros.
// Tipos da base de dados, a partir dos gerados pelo Supabase para o projeto
// "Paint it" (generate_typescript_types), compactados. Atualizar depois de cada
// migração que mude tabelas ou enums.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Participacao = 'incluida' | 'por_decidir' | 'excluida';
type OrigemDaQuantidade = 'medicao' | 'estimativa' | 'documento' | 'medida_pelo_cliente';
type Confirmacao = 'por_confirmar' | 'confirmada';
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
type MemberRole = 'proprietario' | 'gestor' | 'financeiro' | 'leitor' | 'vendedor';
type OrgKind = 'condominio' | 'administradora' | 'particular' | 'pintor' | 'fornecedor';
type RequestStatus = 'rascunho' | 'publicado' | 'encerrado' | 'cancelado';
type WorkType = 'fachadas' | 'zonas_comuns' | 'muros' | 'moradia' | 'interior' | 'caleiras';
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
  | 'isolamento_eps'
  | 'isolamento_eps_grafitado'
  | 'isolamento_xps'
  | 'isolamento_la_mineral'
  | 'isolamento_cortica'
  | 'fixador_capoto'
  | 'rede_fibra_vidro'
  | 'reboco_capoto'
  | 'outro';

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' };
  public: {
    Tables: {
      buildings: {
        Row: {
          acessos: string | null;
          ano_construcao: number | null;
          // Janelas por piso em cada fachada: migração 20261028150000_janelas_por_fachada,
          // aplicada e registada (confirmado no registo do Supabase a 30/10/2026).
          janelas_frente: number | null;
          janelas_esquerda: number | null;
          janelas_direita: number | null;
          janelas_tras: number | null;
          // Obras pretendidas e área aproximada: migração 20261024034142, aplicada e registada
          // (confirmado a 30/10/2026). A leitura continua a ser feita numa consulta própria com o erro
          // tratado — não custa nada e protege de uma base por actualizar noutro ambiente.
          obras_pretendidas: string[];
          area_aproximada_cm2: number | null;
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
          // Medidas do prédio: migração 20261030180000_medidas_do_predio, **ainda por aplicar à base
          // real**. Quem as lê fá-lo numa consulta própria com o erro tratado, e quem as escreve só
          // aparece depois de a coluna existir (ver GeometriaDoPredio).
          largura_cm: number | null;
          profundidade_cm: number | null;
          pe_direito_cm: number | null;
          medidas_origem: string;
          tem_elevador: boolean;
          tem_varandas: boolean;
          forma_implantacao: string | null;
          tipo: BuildingKind;
          updated_at: string;
        };
        Insert: {
          acessos?: string | null;
          ano_construcao?: number | null;
          janelas_frente?: number | null;
          janelas_esquerda?: number | null;
          janelas_direita?: number | null;
          janelas_tras?: number | null;
          obras_pretendidas?: string[];
          area_aproximada_cm2?: number | null;
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
          largura_cm?: number | null;
          profundidade_cm?: number | null;
          pe_direito_cm?: number | null;
          medidas_origem?: string;
          tem_elevador?: boolean;
          tem_varandas?: boolean;
          forma_implantacao?: string | null;
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
          subcategorias: ('b' | 't' | 'g')[] | null;
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
          subcategorias?: ('b' | 't' | 'g')[] | null;
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
      // Migração `toques` (27/10/2026). Escrita à mão enquanto não for aplicada à base real.
      toques: {
        Row: {
          id: string;
          tipo: string;
          alvo: string;
          destinatario: string;
          enviado_em: string;
        };
        Insert: {
          id?: string;
          tipo: string;
          alvo: string;
          destinatario: string;
          enviado_em?: string;
        };
        Update: Partial<Database['public']['Tables']['toques']['Insert']>;
        Relationships: [];
      };
      organizations: {
        Row: {
          alertas_autorizados: boolean;
          atendimento_publico: string | null;
          cae: string | null;
          cae_atividade: string | null;
          codigo_postal: string | null;
          concelho: string | null;
          created_at: string;
          created_by: string;
          email_contacto: string | null;
          gerida_por: string | null;
          id: string;
          kind: OrgKind;
          localidade: string | null;
          // Logótipo da empresa: migração 20261030190000_logotipo_da_empresa, **ainda por aplicar à
          // base real**. Lido numa consulta própria, com o erro tratado.
          logotipo_path: string | null;
          morada_fiscal: string | null;
          nif: string | null;
          nome: string;
          telefone: string | null;
          updated_at: string;
          zonas_servico: string[];
        };
        Insert: {
          alertas_autorizados?: boolean;
          atendimento_publico?: string | null;
          cae?: string | null;
          cae_atividade?: string | null;
          codigo_postal?: string | null;
          concelho?: string | null;
          created_at?: string;
          created_by?: string;
          email_contacto?: string | null;
          gerida_por?: string | null;
          id?: string;
          kind: OrgKind;
          localidade?: string | null;
          logotipo_path?: string | null;
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
          // Migração `tipos_obra_e_datas_flexiveis`, aplicada a 28/10/2026 e conferida contra a
          // base real. Este ficheiro é escrito à mão (aliases e notas próprias); não se regenera.
          tipos_obra: WorkType[];
          datas_flexiveis: string[];
          // Migração `motivo_da_escolha` (29/10/2026), por aplicar: o classificador recusou-a sem
          // instrução do promotor. O relatório lê-a numa consulta à parte, para não cair sem ela.
          motivo_escolha: string | null;
          motivo_escolha_em: string | null;
          titulo: string;
          trabalhos: string[];
          updated_at: string;
          version: number;
          ocupacao_via_publica: ViaPublica;
          trabalhos_modo: string;
          caleiras_estado: string | null;
          caleiras_intervencao: string | null;
          caleiras_metros_substituir_cm: number | null;
          caleiras_comprimento_cm: number | null;
          interior_modo: string | null;
          interior_pe_direito_cm: number | null;
          interior_pe_direito_corrente: boolean;
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
          tipos_obra?: WorkType[];
          datas_flexiveis?: string[];
          motivo_escolha?: string | null;
          motivo_escolha_em?: string | null;
          titulo: string;
          trabalhos?: string[];
          updated_at?: string;
          version?: number;
          ocupacao_via_publica?: ViaPublica;
          trabalhos_modo?: string;
          caleiras_estado?: string | null;
          caleiras_intervencao?: string | null;
          caleiras_metros_substituir_cm?: number | null;
          caleiras_comprimento_cm?: number | null;
          interior_modo?: string | null;
          interior_pe_direito_cm?: number | null;
          interior_pe_direito_corrente?: boolean;
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
          minuta_versao: string | null;
          garantia_anos: number | null;
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
      request_invites: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          created_by: string;
          id: string;
          nota: string | null;
          painter_org_id: string | null;
          redeemed_at: string | null;
          request_id: string;
        };
        Insert: { active?: boolean; code: string; created_at?: string; created_by?: string; id?: string; nota?: string | null; request_id: string };
        Update: { active?: boolean; nota?: string | null };
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
          obra_concluida: boolean;
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
      // Acrescentado à mão, como a nota no topo deste ficheiro manda (migração
      // 20261101070000_limites_de_desconto_do_vendedor).
      // Condóminos com acesso a um prédio (migração 20261101090000_condominos_do_predio).
      building_residents: {
        Row: {
          id: string;
          building_id: string;
          org_id: string;
          user_id: string | null;
          email: string;
          nome: string;
          telemovel: string;
          fracao: string;
          andar: string;
          permilagem: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          revoked_at: string | null;
        };
        Insert: {
          building_id: string;
          org_id: string;
          email: string;
          nome?: string;
          telemovel?: string;
          fracao: string;
          andar?: string;
          permilagem?: number | null;
          created_by: string;
        };
        Update: {
          nome?: string;
          telemovel?: string;
          fracao?: string;
          andar?: string;
          permilagem?: number | null;
          revoked_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: 'building_residents_building_id_fkey'; columns: ['building_id']; isOneToOne: false; referencedRelation: 'buildings'; referencedColumns: ['id'] },
          { foreignKeyName: 'building_residents_org_id_fkey'; columns: ['org_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] },
        ];
      };
      building_access_codes: {
        Row: { building_id: string; org_id: string; codigo: string; created_by: string; created_at: string; revoked_at: string | null };
        Insert: { building_id: string; org_id: string; codigo: string; created_by: string };
        Update: { codigo?: string; revoked_at?: string | null };
        Relationships: [];
      };
      proposal_votes: {
        Row: { request_id: string; resident_id: string; proposal_id: string; updated_at: string };
        Insert: never;
        Update: never;
        Relationships: [
          { foreignKeyName: 'proposal_votes_resident_id_fkey'; columns: ['resident_id']; isOneToOne: false; referencedRelation: 'building_residents'; referencedColumns: ['id'] },
          { foreignKeyName: 'proposal_votes_proposal_id_fkey'; columns: ['proposal_id']; isOneToOne: false; referencedRelation: 'proposals'; referencedColumns: ['id'] },
        ];
      };
      supplier_discount_limits: {
        Row: {
          id: string;
          org_id: string;
          vendedor_user_id: string | null;
          tipo: ProductType | null;
          product_id: string | null;
          limite_bps: number;
          created_at: string;
          updated_by: string;
        };
        Insert: {
          org_id: string;
          vendedor_user_id?: string | null;
          tipo?: ProductType | null;
          product_id?: string | null;
          limite_bps: number;
        };
        Update: { limite_bps?: number };
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
          perfil: 'primeira_compra' | 'cliente_frequente' | 'cliente_premium' | null;
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
          perfil?: 'primeira_compra' | 'cliente_frequente' | 'cliente_premium' | null;
          product_id?: string | null;
          tipo?: ProductType | null;
          valido_ate?: string | null;
        };
        Update: Partial<Database['public']['Tables']['supplier_discounts']['Insert']>;
        Relationships: [];
      };
      supplier_customers: {
        Row: { nota: string; org_id: string; painter_org_id: string; premium: boolean; updated_at: string; updated_by: string | null };
        Insert: { nota?: string; org_id: string; painter_org_id: string; premium?: boolean; updated_at?: string; updated_by?: string | null };
        Update: Partial<Database['public']['Tables']['supplier_customers']['Insert']>;
        Relationships: [];
      };
      supplier_painter_invites: {
        Row: { created_at: string; created_by: string | null; email: string; id: string; morada: string; nome: string; org_id: string; referral_code_id: string; telefone: string };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          email: string;
          id?: string;
          morada: string;
          nome: string;
          org_id: string;
          referral_code_id: string;
          telefone: string;
        };
        Update: never;
        Relationships: [
          { foreignKeyName: 'supplier_painter_invites_referral_code_id_fkey'; columns: ['referral_code_id']; isOneToOne: true; referencedRelation: 'referral_codes'; referencedColumns: ['id'] },
        ];
      };
      reference_products: {
        Row: {
          acabamento: string | null; base_aquosa: boolean | null; complementares: string[]; condutividade_termica_w_mk: number | null; cores: string | null;
          created_at: string; demaos: string | null; descricao: string | null; diluicao: string | null; dimensoes: string | null; embalagens_l: number[];
          espessuras_mm: number[]; foto_path: string | null; id: string; m2_por_embalagem: number | null; marca: string; nome: string; nota: string | null;
          nota_interna: string | null; preco_data: string | null; preco_embalagem_l: number | null; preco_fonte: string | null; preco_referencia_cents: number | null;
          reacao_fogo: string | null; rendimento_estimado: boolean; rendimento_m2_l: number | null; secagem_horas: number | null; tipo: ProductType;
          // Migração `durabilidade_declarada` (28/10/2026). Seis colunas e não uma, de propósito: um
          // número sem a formulação original, as condições e a fonte vira "dura 10 anos" a partir de
          // um "até 10 anos" — e a base recusa gravá-lo sozinho. Nulo = não indicada, nunca zero.
          durabilidade_anos: number | null; durabilidade_tipo: 'declarada' | 'garantia_fabricante' | null;
          durabilidade_declaracao: string | null; durabilidade_condicoes: string | null;
          durabilidade_fonte: string | null; durabilidade_verificada_em: string | null;
          unidade_venda: string | null; url_ficha_tecnica: string | null; url_produto: string | null; uso: string | null; visivel: boolean;
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
      worksite_addenda: {
        Row: {
          criada_em: string;
          descricao: string;
          worksite_id: string;
          estado: 'proposta' | 'aceite' | 'recusada' | 'retirada' | 'oferecido';
          foto_path: string | null;
          id: string;
          nota_cliente: string | null;
          painter_org_id: string;
          respondida_em: string | null;
          valor_cents: number;
        };
        Insert: {
          criada_em?: string;
          descricao: string;
          worksite_id: string;
          estado?: 'proposta' | 'aceite' | 'recusada' | 'retirada' | 'oferecido';
          foto_path?: string | null;
          id?: string;
          nota_cliente?: string | null;
          painter_org_id?: string;
          respondida_em?: string | null;
          valor_cents: number;
        };
        Update: Partial<Database['public']['Tables']['worksite_addenda']['Insert']>;
        Relationships: [];
      };
      public_tenders: {
        Row: {
          anuncio_url: string | null;
          concelho: string | null;
          cpv: string | null;
          created_at: string;
          distrito: string;
          documentos_exigidos: string[];
          entidade: string;
          id: string;
          objeto: string;
          plataforma: string | null;
          prazo_entrega: string;
          publicado_em: string | null;
          referencia: string;
          subcategorias: ('b' | 't' | 'g')[];
          valor_cents: number | null;
        };
        Insert: Omit<Database['public']['Tables']['public_tenders']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['public_tenders']['Insert']>;
        Relationships: [];
      };
      public_contracts: {
        Row: {
          adjudicatario_nif: string | null;
          adjudicatario_nome: string | null;
          ano: number;
          carregado_em: string;
          concelho: string | null;
          confianca: 'alta' | 'media';
          convidados: { nif: string | null; nome: string }[];
          cpv: string[];
          data_celebracao: string | null;
          distrito: string | null;
          entidade_nif: string | null;
          entidade_nome: string;
          id: string;
          id_contrato: string;
          n_convidados: number;
          objecto: string;
          por_convite: boolean;
          preco_cents: number;
          procedimento: string;
          via: 'cpv' | 'objecto' | 'ambos';
        };
        Insert: Omit<Database['public']['Tables']['public_contracts']['Row'], 'id' | 'carregado_em' | 'convidados' | 'n_convidados' | 'cpv'> & {
          id?: string;
          carregado_em?: string;
          convidados?: { nif: string | null; nome: string }[];
          n_convidados?: number;
          cpv?: string[];
        };
        Update: Partial<Database['public']['Tables']['public_contracts']['Insert']>;
        Relationships: [];
      };
      public_contracts_loads: {
        Row: { ano: number; contratos: number; corrida_em: string; origem: string | null };
        Insert: { ano: number; contratos?: number; corrida_em?: string; origem?: string | null };
        Update: Partial<Database['public']['Tables']['public_contracts_loads']['Insert']>;
        Relationships: [];
      };
      painter_people: {
        Row: {
          ativo: boolean;
          created_at: string;
          funcao: string;
          id: string;
          nome: string;
          painter_org_id: string;
          telefone: string | null;
        };
        Insert: Omit<Database['public']['Tables']['painter_people']['Row'], 'id' | 'created_at' | 'ativo' | 'funcao'> & {
          id?: string;
          created_at?: string;
          ativo?: boolean;
          funcao?: string;
        };
        Update: Partial<Database['public']['Tables']['painter_people']['Insert']>;
        Relationships: [];
      };
      painter_person_rates: {
        Row: { created_at: string; custo_hora_cents: number; desde: string; id: string; person_id: string };
        Insert: { created_at?: string; custo_hora_cents: number; desde: string; id?: string; person_id: string };
        Update: Partial<Database['public']['Tables']['painter_person_rates']['Insert']>;
        Relationships: [];
      };
      painter_tender_prefs: {
        Row: { distritos: string[]; org_id: string; updated_at: string };
        Insert: { distritos?: string[]; org_id: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['painter_tender_prefs']['Insert']>;
        Relationships: [];
      };
      org_subscriptions: {
        Row: {
          cancelada_em: string | null;
          created_at: string;
          estado: 'ativa' | 'por_pagar' | 'cancelada';
          id: string;
          inicio: string;
          org_id: string;
          periodicidade: 'mensal' | 'anual';
          plano: 'gratuito' | 'pro';
          preco_cents: number;
          preco_versao: string;
          stripe_subscription_id: string | null;
          valida_ate: string | null;
        };
        Insert: {
          cancelada_em?: string | null;
          created_at?: string;
          estado?: 'ativa' | 'por_pagar' | 'cancelada';
          id?: string;
          inicio?: string;
          org_id: string;
          periodicidade: 'mensal' | 'anual';
          plano: 'gratuito' | 'pro';
          preco_cents: number;
          preco_versao: string;
          stripe_subscription_id?: string | null;
          valida_ate?: string | null;
        };
        Update: Partial<Database['public']['Tables']['org_subscriptions']['Insert']>;
        Relationships: [];
      };
      painter_terms_acceptances: {
        Row: { accepted_at: string; accepted_by: string; painter_org_id: string; version: string };
        Insert: { accepted_at?: string; accepted_by?: string; painter_org_id: string; version: string };
        Update: never;
        Relationships: [];
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
      request_surveys: {
        Row: {
          clarification_excluded_orgs: string[];
          concluded_at: string | null;
          // Acrescentado à mão, como a nota no topo deste ficheiro manda: a regeneração completa traz
          // hoje dezenas de erros de tipos e é dívida à parte. A migração
          // 20261101040000_referencia_do_levantamento está aplicada à base real (01/11/2026).
          numero: number;
          // 20261105094801_convocatoria_por_ondas: ao fim das ondas sem resposta.
          convocatoria_esgotada_em: string | null;
          // 20261105111016_convocatoria_sem_candidatos: equipa avisada de que não havia ninguém na zona (uma vez).
          convocatoria_sem_candidatos_em: string | null;
          contact_notes: string;
          created_at: string;
          created_by: string;
          id: string;
          request_id: string;
          reserve_deadline: string | null;
          reserved_at: string | null;
          scheduled_at: string | null;
          status: 'aberto' | 'reservado' | 'concluido' | 'expirado' | 'cancelado';
          vendedor_org_id: string | null;
          vendedor_user_id: string | null;
        };
        Insert: { request_id: string };
        Update: { contact_notes?: string; scheduled_at?: string | null; convocatoria_esgotada_em?: string | null; convocatoria_sem_candidatos_em?: string | null };
        Relationships: [];
      };
      // Uma tentativa de levantamento (migração 20261031200000): quem aceitou, com que prazos, o que
      // registou e o que o cliente respondeu. Nunca se reescreve — libertar a reserva fecha a tentativa e
      // abre outra. Só se escreve pelas funções, por isso não há Insert nem Update.
      survey_attempts: {
        Row: {
          id: string;
          survey_id: string;
          numero: number;
          vendedor_org_id: string;
          vendedor_user_id: string | null;
          aceita_em: string;
          prazo_contacto: string;
          prazo_conclusao: string;
          limite_adiamento: string;
          contacto_registado_em: string | null;
          contacto_notas: string;
          agendado_para: string | null;
          resposta_cliente: 'agendado_48h' | 'adiado' | 'nao_contactado' | null;
          resposta_cliente_em: string | null;
          adiado_para: string | null;
          estado: 'ativa' | 'concluida' | 'libertada' | 'em_revisao';
          fecho_em: string | null;
          fecho_motivo: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      // Escrito à mão enquanto a migração 20261101050000_disponibilidade_e_alertas não corre no painel;
      // regenerar o ficheiro depois de aplicar (CLAUDE.md, «Depois de aplicar»).
      survey_availability: {
        // alerta_whatsapp e telemovel_whatsapp: migração 20261102090000_avisos_por_whatsapp.
        // concelho_base, raio_km, recebimento, nif_pessoal: 20261105094801_convocatoria_por_ondas (aplicada a 05/11/2026).
        Row: { user_id: string; suspenso_ate: string | null; alerta_email: boolean; alerta_whatsapp: boolean; telemovel_whatsapp: string | null; concelho_base: string | null; raio_km: number | null; recebimento: 'empresa' | 'proprio'; nif_pessoal: string | null; updated_at: string };
        Insert: { user_id: string; suspenso_ate?: string | null; alerta_email?: boolean; alerta_whatsapp?: boolean; telemovel_whatsapp?: string | null; concelho_base?: string | null; raio_km?: number | null; recebimento?: 'empresa' | 'proprio'; nif_pessoal?: string | null };
        Update: { suspenso_ate?: string | null; alerta_email?: boolean; alerta_whatsapp?: boolean; telemovel_whatsapp?: string | null; concelho_base?: string | null; raio_km?: number | null; recebimento?: 'empresa' | 'proprio'; nif_pessoal?: string | null };
        Relationships: [];
      };
      // Convocatória por ondas: 20261105094801_convocatoria_por_ondas (aplicada a 05/11/2026). Só a chave de
      // serviço escreve; cada pessoa lê os seus convites, a equipa lê tudo.
      survey_waves: {
        Row: { id: string; survey_id: string; numero: number; versao_regras: string; enviada_em: string };
        Insert: { survey_id: string; numero: number; versao_regras: string; enviada_em?: string };
        Update: never;
        Relationships: [];
      };
      survey_invites: {
        Row: {
          id: string; wave_id: string; survey_id: string; user_id: string; org_id: string; telemovel: string;
          estado: 'a_enviar' | 'enviado' | 'falhou' | 'aceite' | 'tarde' | 'expirado';
          twilio_sid: string | null; erro: string | null; enviado_em: string | null; respondido_em: string | null; created_at: string;
        };
        Insert: { wave_id: string; survey_id: string; user_id: string; org_id: string; telemovel: string; estado?: 'a_enviar' | 'enviado' | 'falhou' };
        Update: { estado?: 'a_enviar' | 'enviado' | 'falhou' | 'aceite' | 'tarde' | 'expirado'; twilio_sid?: string | null; erro?: string | null; enviado_em?: string | null; respondido_em?: string | null };
        Relationships: [];
      };
      whatsapp_messages: {
        Row: {
          id: string; direcao: 'saida' | 'entrada'; twilio_sid: string | null; para: string; de: string; modelo: string | null;
          variaveis: Json | null; corpo: string | null; estado: string; erro: string | null; invite_id: string | null; created_at: string; updated_at: string;
        };
        Insert: { direcao: 'saida' | 'entrada'; twilio_sid?: string | null; para: string; de: string; modelo?: string | null; variaveis?: Json | null; corpo?: string | null; estado?: string; erro?: string | null; invite_id?: string | null };
        Update: { estado?: string; erro?: string | null; updated_at?: string };
        Relationships: [];
      };
      // Números de WhatsApp confirmados por mensagem recebida: 20261106110000_numeros_de_whatsapp_confirmados.
      // Só se lê (a própria pessoa); escreve-se pelas funções `confirmar_numero_whatsapp`, `parar_whatsapp` e `remover_numero_whatsapp`.
      whatsapp_numeros: {
        Row: { id: string; user_id: string; numero: string; confirmado_em: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      avisos_por_email: {
        // Só o esvaziamento (chave de serviço) a toca; sem políticas, de propósito. Colunas whatsapp_*: migração 20261102090000.
        Row: { id: string; notification_id: string; attempt_id: string | null; destinatario: string; assunto: string; estado: string; tentativas: number; proxima_tentativa_em: string; ultima_tentativa_em: string | null; ultimo_erro: string | null; enviado_em: string | null; created_at: string; whatsapp_estado: 'enviado' | 'falhou' | 'sem_consentimento' | null; whatsapp_erro: string | null; whatsapp_em: string | null };
        Insert: never;
        Update: { whatsapp_estado?: 'enviado' | 'falhou' | 'sem_consentimento' | null; whatsapp_erro?: string | null; whatsapp_em?: string | null };
        Relationships: [];
      };
      supplier_stores: {
        Row: {
          codigo_postal: string;
          concelho: string | null;
          created_at: string;
          created_by: string;
          id: string;
          localidade: string;
          morada: string;
          nome: string;
          org_id: string;
        };
        Insert: {
          codigo_postal: string;
          concelho?: string | null;
          created_by: string;
          localidade: string;
          morada: string;
          nome: string;
          org_id: string;
        };
        Update: { codigo_postal?: string; concelho?: string | null; localidade?: string; morada?: string; nome?: string };
        Relationships: [];
      };
      supplier_survey_coverage: {
        Row: { concelhos: string[]; org_id: string; todo_o_pais: boolean; updated_at: string };
        Insert: { concelhos?: string[]; org_id: string; todo_o_pais?: boolean };
        Update: { concelhos?: string[]; todo_o_pais?: boolean };
        Relationships: [];
      };
      survey_reviews: {
        Row: { comentario: string; created_at: string; created_by: string; id: string; nota: number; request_survey_id: string; vendedor_user_id: string };
        Insert: { comentario?: string; nota: number; request_survey_id: string };
        Update: never;
        Relationships: [];
      };
      survey_clarifications: {
        Row: {
          confirm_deadline: string | null;
          confirmed_at: string | null;
          created_at: string;
          id: string;
          request_survey_id: string;
          resposta: string | null;
          respond_deadline: string | null;
          respondido_em: string | null;
          status: 'aberto' | 'respondido' | 'expirado';
          vendedor_org_id: string | null;
          vendedor_user_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      survey_clarification_items: {
        Row: { clarification_id: string; created_at: string; id: string; painter_user_id: string; texto: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      survey_info_reviews: {
        Row: { comentario: string; created_at: string; nota: number; painter_user_id: string; request_survey_id: string; updated_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      avaliador_bonus_credits: {
        Row: {
          created_at: string;
          estado: 'disponivel' | 'usado';
          id: string;
          invite_id: string;
          org_id: string;
          usado_em: string | null;
          usado_em_payout: string | null;
        };
        Insert: { org_id: string; invite_id: string };
        Update: { estado?: 'disponivel' | 'usado'; usado_em?: string | null; usado_em_payout?: string | null };
        Relationships: [];
      };
      survey_payouts: {
        Row: {
          amount_cents: number;
          created_at: string;
          engagement_id: string;
          estado: 'adjudicada' | 'paga' | 'sem_efeito';
          fee_recebido_em: string;
          id: string;
          motivo: string | null;
          redemption_id: string | null;
          request_survey_id: string;
          supplier_org_id: string;
          // 20261105103940_comissoes_pessoais_do_avaliador: o pagamento é da pessoa.
          vendedor_user_id: string | null;
        };
        Insert: { amount_cents: number; engagement_id: string; fee_recebido_em: string; request_survey_id: string; supplier_org_id: string; vendedor_user_id: string | null };
        Update: never;
        Relationships: [];
      };
      survey_redemptions: {
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
          // 20261105103940_comissoes_pessoais_do_avaliador: resgates da pessoa (nulo nos antigos, de empresa).
          user_id: string | null;
          nif: string | null;
          documento: 'recibo_verde' | 'ato_isolado' | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      // 20261105103940_comissoes_pessoais_do_avaliador: dados de pagamento da pessoa (só ela e a equipa os leem).
      avaliador_payout_details: {
        Row: {
          user_id: string; nif: string; titular: string; iban: string; documento: 'recibo_verde' | 'ato_isolado';
          cobra_iva: boolean; isencao_iva: string | null; declaracao_retencao: 'nao_sujeito' | 'sujeito' | 'dispensa' | null;
          retencao_bps: number; regime_validado: boolean; updated_at: string;
        };
        Insert: {
          user_id: string; nif: string; titular: string; iban: string; documento: 'recibo_verde' | 'ato_isolado';
          cobra_iva?: boolean; isencao_iva?: string | null; declaracao_retencao?: 'nao_sujeito' | 'sujeito' | 'dispensa' | null;
        };
        Update: Partial<Database['public']['Tables']['avaliador_payout_details']['Insert']>;
        Relationships: [];
      };
      survey_terms_acceptances: {
        Row: { accepted_at: string; user_id: string; version: string };
        Insert: { accepted_at?: string; user_id: string; version: string };
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
          org_id: string | null;
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
          org_id?: string | null;
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
      fiscal_document_envios: {
        Row: { created_at: string; document_id: string; erro: string | null; estado: 'enviado' | 'falhou'; id: string; para: string };
        Insert: { created_at?: string; document_id: string; erro?: string | null; estado: 'enviado' | 'falhou'; id?: string; para: string };
        Update: Partial<Database['public']['Tables']['fiscal_document_envios']['Insert']>;
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
          todo_o_pais: boolean;
        };
        Insert: {
          concelhos?: string[];
          condicoes?: string;
          custo_cents?: number | null;
          incluida?: boolean;
          minimo_cents?: number | null;
          org_id: string;
          todo_o_pais?: boolean;
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
          resposta: string | null;
          resposta_at: string | null;
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
        Update: { atendimento?: number; comentario?: string; entrega?: number; produto?: number; resposta?: string | null };
        Relationships: [];
      };
      painter_quotes: {
        Row: {
          cliente_contacto: string | null;
          cliente_nome: string;
          // Migração `cliente_do_orcamento`, aplicada a 28/10/2026.
          cliente_nif: string | null;
          created_at: string;
          seguimento: boolean;
          duracao_dias: number | null;
          enviado_em: string | null;
          estado: 'rascunho' | 'enviado' | 'ganho' | 'perdido';
          exclusoes: string;
          garantia_anos: number | null;
          id: string;
          inicio_possivel: string | null;
          iva_bps: number;
          local: string | null;
          notas: string;
          numero: number;
          org_id: string;
          titulo: string | null;
          validade: string | null;
          worksite_id: string | null;
        };
        Insert: {
          cliente_contacto?: string | null;
          cliente_nif?: string | null;
          seguimento?: boolean;
          cliente_nome: string;
          created_at?: string;
          duracao_dias?: number | null;
          enviado_em?: string | null;
          estado?: 'rascunho' | 'enviado' | 'ganho' | 'perdido';
          exclusoes?: string;
          garantia_anos?: number | null;
          id?: string;
          inicio_possivel?: string | null;
          iva_bps?: number;
          local?: string | null;
          notas?: string;
          numero?: number;
          org_id: string;
          titulo?: string | null;
          validade?: string | null;
          worksite_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['painter_quotes']['Insert']>;
        Relationships: [];
      };
      painter_quote_lines: {
        Row: {
          categoria: 'preparacao' | 'reparacao' | 'pintura' | 'acessos' | 'licencas' | 'outro';
          created_at: string;
          demaos: number | null;
          descricao: string;
          id: string;
          inclusao: 'incluido' | 'opcional' | 'condicionado' | 'nao_incluido';
          ordem: number;
          org_id: string;
          preco_unitario: number;
          produto: string | null;
          quantidade: number;
          quote_id: string;
          trabalho: string | null;
          unidade: 'm2' | 'ml' | 'un' | 'vg';
        };
        Insert: {
          categoria: 'preparacao' | 'reparacao' | 'pintura' | 'acessos' | 'licencas' | 'outro';
          created_at?: string;
          demaos?: number | null;
          descricao: string;
          id?: string;
          inclusao?: 'incluido' | 'opcional' | 'condicionado' | 'nao_incluido';
          ordem?: number;
          org_id?: string;
          preco_unitario?: number;
          produto?: string | null;
          quantidade?: number;
          quote_id: string;
          trabalho?: string | null;
          unidade?: 'm2' | 'ml' | 'un' | 'vg';
        };
        Update: Partial<Database['public']['Tables']['painter_quote_lines']['Insert']>;
        Relationships: [];
      };
      org_price_book: {
        Row: {
          categoria: 'preparacao' | 'reparacao' | 'pintura' | 'acessos' | 'licencas' | 'outro';
          chave: string;
          descricao: string;
          id: string;
          org_id: string;
          preco_unitario: number;
          ultima_vez: string;
          unidade: 'm2' | 'ml' | 'un' | 'vg';
          vezes: number;
        };
        Insert: {
          categoria: 'preparacao' | 'reparacao' | 'pintura' | 'acessos' | 'licencas' | 'outro';
          chave: string;
          descricao: string;
          id?: string;
          org_id: string;
          preco_unitario: number;
          ultima_vez?: string;
          unidade: 'm2' | 'ml' | 'un' | 'vg';
          vezes?: number;
        };
        Update: Partial<Database['public']['Tables']['org_price_book']['Insert']>;
        Relationships: [];
      };
      worksite_photos: {
        Row: {
          created_by: string;
          fase: 'antes' | 'preparacao' | 'durante' | 'depois';
          id: string;
          legenda: string | null;
          org_id: string;
          produto: string | null;
          registada_em: string;
          storage_path: string;
          worksite_id: string;
          zona: string | null;
        };
        Insert: {
          created_by?: string;
          fase: 'antes' | 'preparacao' | 'durante' | 'depois';
          id?: string;
          legenda?: string | null;
          org_id?: string;
          produto?: string | null;
          registada_em?: string;
          storage_path: string;
          worksite_id: string;
          zona?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      worksites: {
        Row: {
          area_cm2: number | null;
          cliente_nome: string | null;
          // Migração `cobranca` (27/10/2026), escritas à mão até ser aplicada.
          cliente_contacto: string | null;
          cobranca: boolean;
          created_at: string;
          engagement_id: string | null;
          estado: 'ativa' | 'concluida' | 'cancelada';
          fim: string | null;
          id: string;
          inicio: string | null;
          local: string | null;
          nome: string;
          notas: string | null;
          org_id: string;
          valor_cents: number | null;
        };
        Insert: {
          area_cm2?: number | null;
          cliente_nome?: string | null;
          cliente_contacto?: string | null;
          cobranca?: boolean;
          created_at?: string;
          engagement_id?: string | null;
          estado?: 'ativa' | 'concluida' | 'cancelada';
          fim?: string | null;
          id?: string;
          inicio?: string | null;
          local?: string | null;
          nome: string;
          notas?: string | null;
          org_id: string;
          valor_cents?: number | null;
        };
        Update: Partial<Database['public']['Tables']['worksites']['Insert']>;
        Relationships: [];
      };
      org_consumables: {
        Row: { created_at: string; id: string; minimo: number; nome: string; org_id: string; unidade: 'un' | 'l' | 'kg' | 'm' | 'm2' | 'rolo' | 'caixa' };
        Insert: { created_at?: string; id?: string; minimo?: number; nome: string; org_id: string; unidade?: 'un' | 'l' | 'kg' | 'm' | 'm2' | 'rolo' | 'caixa' };
        Update: Partial<Database['public']['Tables']['org_consumables']['Insert']>;
        Relationships: [];
      };
      consumable_moves: {
        Row: { consumable_id: string; created_at: string; data: string; id: string; nota: string | null; org_id: string; quantidade: number; worksite_id: string | null };
        Insert: { consumable_id: string; created_at?: string; data?: string; id?: string; nota?: string | null; org_id: string; quantidade: number; worksite_id?: string | null };
        Update: Partial<Database['public']['Tables']['consumable_moves']['Insert']>;
        Relationships: [];
      };
      worksite_members: {
        Row: {
          person_id: string | null;
          ativo: boolean;
          created_at: string;
          custo_hora_cents: number | null;
          worksite_id: string;
          funcao: string;
          id: string;
          nome: string;
          painter_org_id: string;
          telefone: string | null;
        };
        Insert: {
          ativo?: boolean;
          custo_hora_cents?: number | null;
          worksite_id: string;
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
          worksite_id: string;
          estado: string;
          fim: string | null;
          id: string;
          inicio: string | null;
          nome: string;
          painter_org_id: string;
        };
        Insert: { worksite_id: string; estado?: string; fim?: string | null; inicio?: string | null; nome: string; painter_org_id?: string };
        Update: { estado?: string; fim?: string | null; inicio?: string | null; nome?: string };
        Relationships: [];
      };
      worksite_entries: {
        Row: {
          comprovativo_path: string | null;
          categoria: string | null;
          created_at: string;
          data: string;
          descricao: string;
          worksite_id: string;
          horas: number | null;
          id: string;
          meio: string | null;
          member_id: string | null;
          painter_org_id: string;
          prevista: string | null;
          recebida_em: string | null;
          tipo: WorksiteEntryKind;
          tipo_dia: 'util' | 'descanso' | null;
          valor_cents: number | null;
        };
        Insert: {
          comprovativo_path?: string | null;
          categoria?: string | null;
          data?: string;
          descricao?: string;
          worksite_id: string;
          horas?: number | null;
          meio?: string | null;
          member_id?: string | null;
          painter_org_id?: string;
          prevista?: string | null;
          recebida_em?: string | null;
          tipo: WorksiteEntryKind;
          tipo_dia?: 'util' | 'descanso' | null;
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
          capoto: Json;
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
          capoto?: Json;
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
          /** Zona do pedido a que diz respeito; nulo = o pedido todo (migração `fotografias_por_zona`). */
          zona_id: string | null;
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
          zona_id?: string | null;
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
          // As três dimensões da zona (migração 20261030090000). Acrescentadas à mão, como a nota
          // do topo manda: a regeneração completa traz 87 erros de tipos e é dívida à parte.
          participacao: Participacao;
          origem_quantidade: OrigemDaQuantidade | null;
          // Migração 20261106083508 (aplicada a 06/11/2026): margem da medição do cliente pela fotografia.
          margem_bps: number | null;
          /** O lado da planta do prédio onde fica o alçado (migração 20261106103000; ainda por aplicar à base real). */
          face_do_predio: string | null;
          confirmacao: Confirmacao;
          registado_por: string | null;
          registado_em: string | null;
          observacoes: string | null;
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
          participacao?: Participacao;
          origem_quantidade?: OrigemDaQuantidade | null;
          margem_bps?: number | null;
          face_do_predio?: string | null;
          confirmacao?: Confirmacao;
          registado_por?: string | null;
          registado_em?: string | null;
          observacoes?: string | null;
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
          forma_implantacao: string | null;
          tipo_imovel: BuildingKind;
          tipo_obra: WorkType;
          // Migração `tipos_obra_e_datas_flexiveis`, aplicada a 28/10/2026 (ver nota em work_requests).
          tipos_obra: WorkType[];
          datas_flexiveis: string[];
          janelas_frente: number | null;
          janelas_esquerda: number | null;
          janelas_direita: number | null;
          janelas_tras: number | null;
          trabalhos: string[];
          version: number;
          ocupacao_via_publica: ViaPublica;
          trabalhos_modo: string;
          caleiras_estado: string | null;
          caleiras_intervencao: string | null;
          caleiras_metros_substituir_cm: number | null;
          caleiras_comprimento_cm: number | null;
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
      elementos_do_contrato: {
        Row: { id: string; engagement_id: string; lado: string; campo: string; valor: string; validacao: string; criado_por: string; criado_em: string };
        Insert: { id?: string; engagement_id: string; lado: string; campo: string; valor: string; validacao: string; criado_por: string; criado_em?: string };
        Update: never;
        Relationships: [];
      };
      codigos_de_email: {
        Row: { id: string; engagement_id: string; lado: string; email: string; codigo_sha256: string; criado_por: string; criado_em: string; expira_em: string; tentativas: number; usado_em: string | null };
        Insert: { id?: string; engagement_id: string; lado: string; email: string; codigo_sha256: string; criado_por: string; criado_em?: string; expira_em: string; tentativas?: number; usado_em?: string | null };
        Update: { tentativas?: number; usado_em?: string | null };
        Relationships: [];
      };
      comprovativos_de_pagamento: {
        Row: { id: string; engagement_id: string; tranche: string; valor_cents: number; pago_em: string; nota: string | null; ficheiro_path: string | null; ficheiro_sha256: string | null; ficheiro_tipo: string | null; criado_por: string; criado_em: string };
        Insert: { id?: string; engagement_id: string; tranche: string; valor_cents: number; pago_em: string; nota?: string | null; ficheiro_path?: string | null; ficheiro_sha256?: string | null; ficheiro_tipo?: string | null; criado_por: string; criado_em?: string };
        Update: never;
        Relationships: [];
      };
      conclusao_da_obra: {
        Row: { id: string; engagement_id: string; lado: string; passo: string; data_conclusao: string | null; razao: string | null; ficheiro_path: string | null; ficheiro_sha256: string | null; ficheiro_tipo: string | null; criado_por: string; criado_em: string };
        Insert: { id?: string; engagement_id: string; lado: string; passo: string; data_conclusao?: string | null; razao?: string | null; ficheiro_path?: string | null; ficheiro_sha256?: string | null; ficheiro_tipo?: string | null; criado_por: string; criado_em?: string };
        Update: never;
        Relationships: [];
      };
      garantias_calculadas: {
        Row: { id: string; engagement_id: string; inicio: string; anos: number; fim_garantia: string; fim_conservacao: string; calculado_em: string };
        Insert: { id?: string; engagement_id: string; inicio: string; anos: number; fim_garantia: string; fim_conservacao: string; calculado_em?: string };
        Update: never;
        Relationships: [];
      };
      registo_da_obra: {
        Row: { id: string; ordem: number; request_id: string | null; engagement_id: string | null; org_id: string | null; painter_org_id: string | null; tipo: string; dados: Json; autor: string | null; criado_em: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      pedidos_de_relatorio: {
        Row: { id: string; request_id: string; org_id: string; motivo: string; nota: string | null; pedido_por: string; pedido_em: string; lado: string };
        Insert: { id?: string; request_id: string; org_id: string; motivo: string; nota?: string | null; pedido_por?: string; pedido_em?: string; lado?: string };
        Update: never;
        Relationships: [];
      };
      relatorios_do_percurso: {
        Row: { id: string; request_id: string; pedido_id: string | null; destinatario: string; versao: number; conteudo: string; sha256: string; emitido_por: string; emitido_em: string };
        Insert: { id?: string; request_id: string; pedido_id?: string | null; destinatario: string; versao: number; conteudo: string; sha256: string; emitido_por: string; emitido_em?: string };
        Update: never;
        Relationships: [];
      };
      request_rooms: {
        Row: {
          id: string; request_id: string; ordem: number; tipo: string; numero: number; comprimento_cm: number | null; largura_cm: number | null;
          perimetro_cm: number | null; pe_direito_cm: number | null; vaos: Json; pintar_paredes: boolean; pintar_teto: boolean;
          area_paredes_manual_cm2: number | null; area_teto_manual_cm2: number | null; cor_referencia: string | null; cor_hex: string | null;
          area_paredes_cm2: number | null; area_teto_cm2: number | null; certeza: string; margem_bp: number | null; vao_minimo_cm2: number;
          registado_por: string | null; registado_em: string;
        };
        Insert: {
          id?: string; request_id: string; ordem?: number; tipo: string; numero?: number; comprimento_cm?: number | null; largura_cm?: number | null;
          perimetro_cm?: number | null; pe_direito_cm?: number | null; vaos?: Json; pintar_paredes?: boolean; pintar_teto?: boolean;
          area_paredes_manual_cm2?: number | null; area_teto_manual_cm2?: number | null; cor_referencia?: string | null; cor_hex?: string | null;
          area_paredes_cm2?: number | null; area_teto_cm2?: number | null; certeza?: string; margem_bp?: number | null; vao_minimo_cm2?: number;
          registado_por?: string | null; registado_em?: string;
        };
        Update: Partial<Database['public']['Tables']['request_rooms']['Insert']>;
        Relationships: [];
      };
      paleta_cores: {
        Row: { codigo: string; nome: string; hex: string; familia: string; ordem: number; ativa: boolean };
        Insert: { codigo: string; nome: string; hex: string; familia: string; ordem?: number; ativa?: boolean };
        Update: { nome?: string; hex?: string; familia?: string; ordem?: number; ativa?: boolean };
        Relationships: [];
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
      // Migração `relatorio_de_propostas` (02/11/2026), escritas à mão: tabelas novas, nunca
      // aplicadas à base real (ver docs/ESTADO.md e o relatório final desta sessão).
      relatorios_de_propostas: {
        Row: {
          id: string;
          request_id: string;
          codigo_obra: string;
          token: string;
          numero_de_propostas: number;
          aviso_integridade: string;
          gerado_por: string;
          gerado_em: string;
        };
        Insert: { request_id: string; codigo_obra: string; numero_de_propostas: number; aviso_integridade: string };
        // Sem política de update: esta tabela nunca se altera depois de criada.
        Update: never;
        Relationships: [
          { foreignKeyName: 'relatorios_de_propostas_request_id_fkey'; columns: ['request_id']; isOneToOne: true; referencedRelation: 'work_requests'; referencedColumns: ['id'] },
        ];
      };
      relatorios_de_propostas_fichas: {
        Row: { id: string; relatorio_id: string; numero: number; codigo_pagina: string; dados: Json };
        Insert: { relatorio_id: string; numero: number; codigo_pagina: string; dados: Json };
        Update: never;
        Relationships: [
          { foreignKeyName: 'relatorios_de_propostas_fichas_relatorio_id_fkey'; columns: ['relatorio_id']; isOneToOne: false; referencedRelation: 'relatorios_de_propostas'; referencedColumns: ['id'] },
        ];
      };
      // Migração `20261106083428_poderes_de_representacao` (05/11/2026), escritas à mão: tabelas novas, por
      // aplicar à base real. Só se escrevem pelas funções `definir_codigo_certidao` e
      // `registar_leitura_poderes` (abaixo), por isso Insert e Update são `never`.
      poderes_de_representacao: {
        Row: {
          org_id: string;
          fonte: 'certidao' | 'ata';
          codigo_entregue_em: string | null;
          forma_de_obrigar: string | null;
          assinaturas_exigidas: number | null;
          valida_ate: string | null;
          lida_em: string | null;
          lida_por: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [
          { foreignKeyName: 'poderes_de_representacao_org_id_fkey'; columns: ['org_id']; isOneToOne: true; referencedRelation: 'organizations'; referencedColumns: ['id'] },
        ];
      };
      poderes_membros: {
        Row: { id: string; org_id: string; ordem: number; nome: string; cargo: string; nif: string | null };
        Insert: never;
        Update: never;
        Relationships: [
          { foreignKeyName: 'poderes_membros_org_id_fkey'; columns: ['org_id']; isOneToOne: false; referencedRelation: 'poderes_de_representacao'; referencedColumns: ['org_id'] },
        ];
      };
      // O código de acesso da certidão: só a equipa da plataforma o lê (RLS).
      certidao_codigos: {
        Row: { org_id: string; codigo: string; definido_por: string | null; definido_em: string };
        Insert: never;
        Update: never;
        Relationships: [
          { foreignKeyName: 'certidao_codigos_org_id_fkey'; columns: ['org_id']; isOneToOne: true; referencedRelation: 'organizations'; referencedColumns: ['id'] },
        ];
      };
    };
    Views: {
      acc_balancete: { Row: { conta: string; credito_cents: number; debito_cents: number; natureza: 'devedora' | 'credora'; nome: string }; Relationships: [] };
      acc_balancete_mensal: { Row: { conta: string; credito_cents: number; debito_cents: number; mes: string }; Relationships: [] };
    };
    Functions: {
      // As quatro peças do Mapa de Contratos Públicos, somadas na base (migração
      // `20261028090000_mapa_somado_na_base`). O tipo de `Returns` é `Mapa`, em
      // `src/domain/mapaContratos.ts`: uma função que devolve `jsonb` chega aqui como `Json`, e é no
      // domínio que a forma está escrita e testada.
      mapa_contratos: {
        Args: { p_desde?: number; p_distritos?: string[]; p_nif?: string };
        Returns: Json;
      };
      // Migração `relatorio_de_propostas` (02/11/2026): leitura pública, sem login, pelo token.
      relatorio_publico: {
        Args: { p_token: string };
        Returns: { codigo_obra: string; numero_de_propostas: number; aviso_integridade: string; gerado_em: string; fichas: Json }[];
      };
      apply_referral_code: { Args: { p_proposal: string; p_code: string | null }; Returns: string | null };
      apply_supplier_referral_code: { Args: { p_org: string; p_code: string | null }; Returns: undefined };
      claim_supplier_invite: { Args: { p_code: string; p_org: string }; Returns: string };
      supplier_invite_info: { Args: { p_code: string }; Returns: { fornecedor: string; ja_aceite: boolean }[] };
      redeem_request_invite: { Args: { p_code: string; p_painter_org: string }; Returns: string };
      request_invite_info: {
        Args: { p_code: string };
        Returns: { request_id: string; tipo_obra: string; concelho: string; ja_redimido: boolean }[];
      };
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
      // Migração `entrega_simultanea` (26/10/2026). Escritas à mão enquanto não for aplicada à base.
      propostas_a_caminho: { Args: { p_request: string }; Returns: number };
      prolongar_prazo: { Args: { p_request: string; p_prazo: string }; Returns: undefined };
      reselect_proposal: { Args: { p_proposal: string }; Returns: undefined };
      active_suppliers: { Args: { p_plan: string }; Returns: string[] };
      delete_organization: { Args: { p_org: string }; Returns: undefined };
      // Só a chave de serviço: a impressão digital do contrato por assinar, depois de cada alteração (06/11/2026).
      registar_versao_da_minuta: { Args: { p_engagement: string; p_sha256: string }; Returns: undefined };
      check_promo_code: { Args: { p_code: string }; Returns: number | null };
      painter_rating: { Args: { p_proposal: string }; Returns: { n: number; media: number | null }[] };
      resolve_listing_report: { Args: { p_report: string; p_suspend: boolean; p_resolucao: string }; Returns: undefined };
      // Só a chave de serviço (webhook do WhatsApp). 'aceite' | 'tarde' | 'sem_inscricao' | 'excluido'.
      aceitar_convite: { Args: { p_invite: string }; Returns: string };
      // Confirmar o número de WhatsApp por mensagem recebida (20261106110000). Devolve o código em claro uma só vez.
      pedir_codigo_whatsapp: { Args: Record<string, never>; Returns: string };
      remover_numero_whatsapp: { Args: { p_id: string }; Returns: undefined };
      cancelar_codigo_whatsapp: { Args: Record<string, never>; Returns: undefined };
      // Só a chave de serviço (webhook). estado: ok | transferido | ja_associado | invalido | demasiadas | cheio.
      confirmar_numero_whatsapp: { Args: { p_codigo: string; p_numero: string }; Returns: Json };
      parar_whatsapp: { Args: { p_numero: string }; Returns: boolean };
      reserve_survey: {
        Args: { p_survey_id: string; p_org: string };
        Returns: {
          id: string;
          request_id: string;
          status: string;
          vendedor_org_id: string | null;
          vendedor_user_id: string | null;
          reserved_at: string | null;
          reserve_deadline: string | null;
          contact_notes: string;
          scheduled_at: string | null;
          concluded_at: string | null;
          created_by: string;
          created_at: string;
        };
      };
      conclude_survey: { Args: { p_survey_id: string }; Returns: undefined };
      cancel_survey: { Args: { p_survey_id: string }; Returns: undefined };
      // Migração 20261030140000. Acrescentada à mão, como o resto deste ficheiro.
      reabrir_levantamento: {
        Args: { p_request: string };
        Returns: Database['public']['Tables']['request_surveys']['Row'];
      };
      survey_vendor_rating: { Args: { p_user: string }; Returns: { n: number; media: number | null }[] };
      survey_preview: { Args: { p_survey_id: string }; Returns: { concelho: string; tipo_obra: string }[] };
      survey_request_redemption: { Args: { p_org: string }; Returns: string };
      avaliador_pedir_resgate: { Args: Record<string, never>; Returns: string };
      avaliador_validar_regime: { Args: { p_user: string; p_bps: number }; Returns: undefined };
      survey_redemption_invoice: { Args: { p_redemption: string; p_numero: string; p_path: string }; Returns: undefined };
      survey_redemption_cancel: { Args: { p_redemption: string; p_motivo: string }; Returns: undefined };
      survey_redemption_pay: { Args: { p_redemption: string; p_ref: string }; Returns: undefined };
      // Pedido de esclarecimento ao vendedor e avaliação da informação pelo pintor (migrações
      // 20261024010647 e 20261024010704). As tabelas já estavam aqui desde que foram escritas; estas
      // seis funções faltavam, porque até 24/10/2026 nenhum ecrã as chamava.
      request_painter_doubt: { Args: { p_request_survey_id: string; p_texto: string }; Returns: undefined };
      clarification_batch: { Args: { p_clarification_id: string }; Returns: { texto: string; created_at: string }[] };
      confirm_clarification: { Args: { p_id: string }; Returns: undefined };
      respond_clarification: { Args: { p_id: string; p_resposta: string }; Returns: undefined };
      claim_clarification: { Args: { p_id: string; p_org: string }; Returns: Database['public']['Tables']['survey_clarifications']['Row'] };
      rate_survey_info: { Args: { p_request_survey_id: string; p_nota: number; p_comentario: string }; Returns: undefined };
      // Adendas ao dossiê (migração 20261024034129): todas as rondas de esclarecimento desta obra, com as
      // perguntas e a resposta de cada uma, sem nunca identificar quem perguntou.
      survey_addenda: {
        Args: { p_request_survey_id: string };
        Returns: { ronda: number; aberta_em: string; estado: string; duvidas: string[]; resposta: string | null; respondido_em: string | null }[];
      };
      // A fila dos avisos por email (migração 20261101020000). Estas duas portas estão abertas só à chave de
      // serviço: quem tem sessão de utilizador não as vê, e por isso só a aplicação as chama.
      // Condóminos (migração 20261101090000_condominos_do_predio).
      predio_por_codigo: { Args: { p_codigo: string }; Returns: { nome_interno: string; concelho: string; condominio: string }[] };
      registar_condomino: {
        Args: { p_codigo: string; p_fracao: string; p_andar: string; p_email: string; p_telemovel: string; p_nome: string };
        Returns: undefined;
      };
      reclamar_acesso_de_condomino: { Args: Record<string, never>; Returns: number };
      votar: { Args: { p_request: string; p_proposal: string }; Returns: undefined };
      reclamar_avisos: {
        Args: { p_limite?: number };
        Returns: { id: string; destinatario: string; assunto: string; texto: string; link: string }[];
      };
      resultado_do_aviso: { Args: { p_id: string; p_ok: boolean; p_erro?: string }; Returns: undefined };
      // Prazos e tentativas do levantamento (migrações 20261031200000 a 20261101000000).
      register_survey_contact: {
        Args: { p_attempt: string; p_notas: string; p_agendado_para: string };
        Returns: Database['public']['Tables']['survey_attempts']['Row'];
      };
      answer_survey_schedule: {
        Args: { p_attempt: string; p_resposta: string; p_data?: string };
        Returns: Database['public']['Tables']['survey_attempts']['Row'];
      };
      survey_schedule_for_client: {
        Args: { p_request: string };
        Returns: {
          attempt_id: string;
          agendado_para: string | null;
          prazo_conclusao: string;
          limite_adiamento: string;
          resposta_cliente: string | null;
          resposta_cliente_em: string | null;
          adiado_para: string | null;
          por_responder: boolean;
        }[];
      };
      // Poderes de representação (migração 20261106083428), escritas à mão até ser aplicada.
      definir_codigo_certidao: { Args: { p_org: string; p_codigo: string }; Returns: undefined };
      registar_leitura_poderes: {
        Args: { p_org: string; p_fonte: string; p_forma_de_obrigar: string; p_assinaturas: number | null; p_valida_ate: string; p_membros: Json };
        Returns: undefined;
      };
      // A assinatura só entra pelo servidor (migração 20261106083458), escrita à mão até ser aplicada. Só a
      // chave de serviço a executa; a tabela `assinaturas_verificadas` não tem entrada aqui porque ninguém
      // com sessão a lê nem a escreve.
      registar_assinatura_verificada: {
        Args: { p_engagement: string; p_kind: EngagementEventKind; p_actor: string; p_payload: Json };
        Returns: undefined;
      };
      survey_client_contact: {
        Args: { p_attempt: string };
        Returns: { nome: string | null; telefone: string | null; email: string | null; morada: string; codigo_postal: string | null; localidade: string | null }[];
      };
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
      order_status: OrderStatus;
      worksite_entry_kind: WorksiteEntryKind;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
