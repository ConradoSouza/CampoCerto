/**
 * Enumerações compartilhadas entre web, app e banco.
 * Os valores precisam bater com os tipos criados em supabase/migrations.
 */

export const PERFIS = [
  "administrador",
  "controladoria",
  "gerente",
  "agronomo",
  "encarregado",
  "operador",
  "almoxarife",
] as const;
export type Perfil = (typeof PERFIS)[number];

export const ROTULO_PERFIL: Record<Perfil, string> = {
  administrador: "Administrador do grupo",
  controladoria: "Controladoria",
  gerente: "Gerente de fazenda",
  agronomo: "Agrônomo ou técnico",
  encarregado: "Encarregado",
  operador: "Operador",
  almoxarife: "Almoxarife",
};

export const ESCOPOS = ["grupo", "empresa", "fazenda"] as const;
export type Escopo = (typeof ESCOPOS)[number];

export const TIPOS_EMPRESA = ["PF", "PJ", "condominio"] as const;
export type TipoEmpresa = (typeof TIPOS_EMPRESA)[number];

export const ROTULO_TIPO_EMPRESA: Record<TipoEmpresa, string> = {
  PF: "Pessoa física",
  PJ: "Pessoa jurídica",
  condominio: "Condomínio",
};

export const POSSES = ["propria", "arrendada", "parceria", "comodato"] as const;
export type Posse = (typeof POSSES)[number];

export const ROTULO_POSSE: Record<Posse, string> = {
  propria: "Própria",
  arrendada: "Arrendada",
  parceria: "Parceria",
  comodato: "Comodato",
};

export const CICLOS = ["verao", "segunda_safra", "inverno", "perene"] as const;
export type Ciclo = (typeof CICLOS)[number];

export const ROTULO_CICLO: Record<Ciclo, string> = {
  verao: "Verão",
  segunda_safra: "Segunda safra",
  inverno: "Inverno",
  perene: "Perene",
};

export const STATUS_SAFRA = ["planejada", "aberta", "encerrada"] as const;
export type StatusSafra = (typeof STATUS_SAFRA)[number];

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;
export type UF = (typeof UFS)[number];
