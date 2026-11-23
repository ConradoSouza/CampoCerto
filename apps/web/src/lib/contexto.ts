import "server-only";
import type { Fazenda, Grupo, Perfil, Permissao, Usuario } from "@campocerto/tipos";
import { ehAdministradorDoGrupo, pode, type Acao, type Modulo } from "@campocerto/regras";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseServidor } from "./supabase/servidor";

export const COOKIE_GRUPO = "cc_grupo";

export interface Contexto {
  usuario: Usuario;
  permissoes: Permissao[];
  grupos: Grupo[];
  grupo: Grupo;
  fazendas: Fazenda[];
  ehAdmin: boolean;
  pode: (fazenda: Fazenda, modulo: Modulo, acao: Acao) => boolean;
  perfis: Set<Perfil>;
}

/** Usuário logado, grupo atual e fazendas visíveis. Uma consulta por requisição. */
export const contexto = cache(async (): Promise<Contexto> => {
  const supabase = await supabaseServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims.sub;
  if (!id) redirect("/login");

  const [{ data: usuario }, { data: permissoes }, { data: grupos }] = await Promise.all([
    supabase.from("usuario").select("*").eq("id", id).single<Usuario>(),
    supabase.from("permissao").select("*").eq("usuario_id", id).is("excluido_em", null).returns<Permissao[]>(),
    supabase.from("grupo").select("*").is("excluido_em", null).order("nome").returns<Grupo[]>(),
  ]);
  if (!usuario) redirect("/login");
  if (!usuario.ativo) redirect("/login?erro=inativo");
  if (!grupos?.length) redirect("/primeiro-acesso");

  const escolhido = (await cookies()).get(COOKIE_GRUPO)?.value;
  const grupo = grupos.find((g) => g.id === escolhido) ?? grupos[0]!;
  const minhas = (permissoes ?? []).filter((p) => p.grupo_id === grupo.id);

  const { data: fazendas } = await supabase
    .from("fazenda")
    .select("id, grupo_id, empresa_id, nome, sigla, municipio, uf, criado_em, atualizado_em, criado_por, excluido_em")
    .eq("grupo_id", grupo.id)
    .is("excluido_em", null)
    .order("nome")
    .returns<Fazenda[]>();

  return {
    usuario,
    permissoes: minhas,
    grupos,
    grupo,
    fazendas: fazendas ?? [],
    ehAdmin: ehAdministradorDoGrupo(minhas, grupo.id),
    pode: (f, modulo, acao) => pode(minhas, f, modulo, acao),
    perfis: new Set(minhas.map((p) => p.perfil)),
  };
});
