import type { MultiPolygon, Point } from "geojson";
import { z } from "zod";
import {
  CICLOS,
  ESCOPOS,
  PERFIS,
  POSSES,
  STATUS_SAFRA,
  TIPOS_EMPRESA,
  UFS,
} from "./enums";

/** Colunas que toda tabela tem (spec: criado_em, atualizado_em, criado_por, excluido_em). */
export interface Registro {
  id: string;
  criado_em: string;
  atualizado_em: string;
  criado_por: string | null;
  excluido_em: string | null;
}

const uuid = z.uuid();
const texto = (max = 200) => z.string().trim().min(1, "Obrigatório").max(max);
const hectares = z.number().nonnegative().multipleOf(0.01);

export interface ConfigGrupo {
  /** Quanto a área apontada pode passar da prevista sem justificativa (OS4). */
  limite_area_excedente_pct: number;
  /** Diferença de dose que gera alerta para o agrônomo (OS5). */
  limite_dose_pct: number;
}

export interface Grupo extends Registro {
  nome: string;
  config: ConfigGrupo;
}

export const empresaEntrada = z.object({
  grupo_id: uuid,
  tipo: z.enum(TIPOS_EMPRESA),
  cpf_cnpj: z.string().trim().min(11).max(18),
  razao_social: texto(),
  nome_fantasia: z.string().trim().max(200).nullish(),
  inscricoes_estaduais: z.array(z.string().trim().min(1).max(20)).default([]),
});
export type EmpresaEntrada = z.infer<typeof empresaEntrada>;
export interface Empresa extends Registro, Omit<EmpresaEntrada, "nome_fantasia"> {
  nome_fantasia: string | null;
}

export const fazendaEntrada = z.object({
  empresa_id: uuid,
  nome: texto(),
  sigla: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,5}$/, "Use de 2 a 5 letras ou números"),
  municipio: texto(120),
  uf: z.enum(UFS),
});
export type FazendaEntrada = z.infer<typeof fazendaEntrada>;
export interface Fazenda extends Registro, FazendaEntrada {
  grupo_id: string;
  sede: Point | null;
}

export const talhaoAtributos = z.object({
  codigo: z.string().trim().min(1).max(20),
  nome: texto(120),
  area_produtiva_ha: hectares.nullable(),
  posse: z.enum(POSSES),
  ativo: z.boolean(),
});
export type TalhaoAtributos = z.infer<typeof talhaoAtributos>;
export interface Talhao extends Registro, TalhaoAtributos {
  grupo_id: string;
  fazenda_id: string;
  contorno: MultiPolygon;
  /** Calculada pelo banco a partir do contorno (geodésica, hectares, 2 casas). */
  area_ha: number;
  origem_ids: string[];
}

export const safraEntrada = z
  .object({
    grupo_id: uuid,
    ano_agricola: z.string().regex(/^\d{4}(\/\d{2})?$/, "Ex.: 2026/27 ou 2026"),
    ciclo: z.enum(CICLOS),
    nome: texto(80),
    inicio: z.iso.date(),
    fim: z.iso.date(),
  })
  .refine((s) => s.fim >= s.inicio, { message: "O fim deve ser depois do início", path: ["fim"] });
export type SafraEntrada = z.infer<typeof safraEntrada>;
export interface Safra extends Registro, SafraEntrada {
  status: (typeof STATUS_SAFRA)[number];
}

export interface Cultura extends Registro {
  grupo_id: string;
  nome: string;
}

export interface Variedade extends Registro {
  grupo_id: string;
  cultura_id: string;
  nome: string;
}

export const ocupacaoEntrada = z.object({
  safra_id: uuid,
  talhao_id: uuid,
  cultura_id: uuid,
  variedade_id: uuid.nullable(),
  area_ha: hectares.positive(),
  plantio_previsto: z.iso.date().nullable(),
});
export type OcupacaoEntrada = z.infer<typeof ocupacaoEntrada>;
export interface Ocupacao extends Registro, OcupacaoEntrada {
  grupo_id: string;
  fazenda_id: string;
}

export interface Usuario extends Registro {
  nome: string;
  email: string | null;
  celular: string | null;
  ativo: boolean;
}

export const permissaoEntrada = z.object({
  usuario_id: uuid,
  perfil: z.enum(PERFIS),
  escopo: z.enum(ESCOPOS),
  escopo_id: uuid,
});
export type PermissaoEntrada = z.infer<typeof permissaoEntrada>;
export interface Permissao extends Registro, PermissaoEntrada {
  grupo_id: string;
}
