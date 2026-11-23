import type { Escopo, Perfil } from "@campocerto/tipos";

export type Modulo = "cadastros" | "os" | "estoque";
/** editar, aprovar, ler, ou só as próprias OS e apontamentos. */
export type Acao = "editar" | "aprovar" | "ler" | "proprias";

/**
 * Matriz de perfis da especificação (seção Perfis).
 * E = editar, A = aprovar, L = ler, P = próprias.
 */
export const MATRIZ: Record<Perfil, Record<Modulo, readonly Acao[]>> = {
  administrador: { cadastros: ["editar", "ler"], os: ["editar", "aprovar", "ler"], estoque: ["editar", "aprovar", "ler"] },
  controladoria: { cadastros: ["ler"], os: ["ler"], estoque: ["ler"] },
  gerente: { cadastros: ["editar", "ler"], os: ["editar", "aprovar", "ler"], estoque: ["aprovar", "ler"] },
  agronomo: { cadastros: ["ler"], os: ["editar", "ler"], estoque: ["ler"] },
  encarregado: { cadastros: ["ler"], os: ["proprias", "aprovar", "ler"], estoque: ["ler"] },
  operador: { cadastros: ["ler"], os: ["proprias"], estoque: [] },
  almoxarife: { cadastros: ["ler"], os: ["ler"], estoque: ["editar", "ler"] },
};

export interface PermissaoEscopo {
  perfil: Perfil;
  escopo: Escopo;
  escopo_id: string;
}

export interface FazendaEscopo {
  id: string;
  empresa_id: string;
  grupo_id: string;
}

/** Uma permissão vale para a fazenda se o escopo for a própria fazenda, a empresa dona ou o grupo. */
export function cobreFazenda(p: PermissaoEscopo, f: FazendaEscopo): boolean {
  switch (p.escopo) {
    case "fazenda":
      return p.escopo_id === f.id;
    case "empresa":
      return p.escopo_id === f.empresa_id;
    case "grupo":
      return p.escopo_id === f.grupo_id;
  }
}

export function perfisNaFazenda(permissoes: PermissaoEscopo[], f: FazendaEscopo): Set<Perfil> {
  return new Set(permissoes.filter((p) => cobreFazenda(p, f)).map((p) => p.perfil));
}

export function pode(permissoes: PermissaoEscopo[], f: FazendaEscopo, modulo: Modulo, acao: Acao): boolean {
  for (const perfil of perfisNaFazenda(permissoes, f)) {
    if (MATRIZ[perfil][modulo].includes(acao)) return true;
  }
  return false;
}

export function ehAdministradorDoGrupo(permissoes: PermissaoEscopo[], grupoId: string): boolean {
  return permissoes.some((p) => p.perfil === "administrador" && p.escopo === "grupo" && p.escopo_id === grupoId);
}
