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
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      building_kind: BuildingKind;
      doc_kind: DocKind;
      doc_status: DocStatus;
      member_role: MemberRole;
      org_kind: OrgKind;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
