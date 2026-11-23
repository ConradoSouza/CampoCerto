import { contexto } from "@/lib/contexto";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { ROTULO_PERFIL, type Empresa, type Permissao, type Usuario } from "@campocerto/tipos";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { alternarUsuario, revogarAcesso } from "./acoes";
import { FormAcesso } from "./FormAcesso";

export const metadata: Metadata = { title: "Usuários e permissões" };

export default async function Usuarios() {
  const ctx = await contexto();
  if (!ctx.ehAdmin) redirect("/");
  const supabase = await supabaseServidor();
  const [{ data: permissoes }, { data: usuarios }, { data: empresas }] = await Promise.all([
    supabase.from("permissao").select("*").eq("grupo_id", ctx.grupo.id).is("excluido_em", null).returns<Permissao[]>(),
    supabase.from("usuario").select("*").order("nome").returns<Usuario[]>(),
    supabase.from("empresa").select("id, razao_social, nome_fantasia").eq("grupo_id", ctx.grupo.id).is("excluido_em", null).returns<Empresa[]>(),
  ]);

  const nomeEscopo = (p: Permissao) =>
    p.escopo === "grupo"
      ? `Grupo inteiro`
      : p.escopo === "empresa"
        ? (empresas ?? []).find((e) => e.id === p.escopo_id)?.nome_fantasia ?? (empresas ?? []).find((e) => e.id === p.escopo_id)?.razao_social ?? "Empresa"
        : ctx.fazendas.find((f) => f.id === p.escopo_id)?.nome ?? "Fazenda";

  const pessoas = (usuarios ?? []).filter((u) => (permissoes ?? []).some((p) => p.usuario_id === u.id));
  const escopos = [
    { valor: `grupo:${ctx.grupo.id}`, rotulo: `Grupo inteiro (${ctx.grupo.nome})` },
    ...(empresas ?? []).map((e) => ({ valor: `empresa:${e.id}`, rotulo: `Empresa: ${e.nome_fantasia || e.razao_social}` })),
    ...ctx.fazendas.map((f) => ({ valor: `fazenda:${f.id}`, rotulo: `Fazenda: ${f.nome}` })),
  ];

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Usuários e permissões</h1>
          <p>Cada permissão é um perfil aplicado ao grupo inteiro, a uma empresa ou a uma fazenda.</p>
        </div>
      </div>
      <div className="duas">
        <section className="caixa">
          <div className="tabela">
            <table>
              <thead><tr><th>Pessoa</th><th>Perfis</th><th></th></tr></thead>
              <tbody>
                {pessoas.map((u) => (
                  <tr key={u.id} className={u.ativo ? "" : "inativo"}>
                    <td><b>{u.nome}</b><br /><small style={{ color: "var(--mut)" }}>{u.email}{!u.ativo && " · desativado"}</small></td>
                    <td>
                      {(permissoes ?? []).filter((p) => p.usuario_id === u.id).map((p) => (
                        <form key={p.id} action={revogarAcesso} className="acoes" style={{ gap: 6, marginBottom: 4 }}>
                          <input type="hidden" name="id" value={p.id} />
                          <span className="etq">{ROTULO_PERFIL[p.perfil]} · {nomeEscopo(p)}</span>
                          {u.id !== ctx.usuario.id && <button className="botao secundario pequeno" aria-label="Remover perfil">Remover</button>}
                        </form>
                      ))}
                    </td>
                    <td>
                      {u.id !== ctx.usuario.id && (
                        <form action={alternarUsuario}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="ativo" value={String(!u.ativo)} />
                          <button className="botao secundario pequeno">{u.ativo ? "Desativar" : "Reativar"}</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <details className="painel" open>
          <summary>Conceder acesso</summary>
          <FormAcesso escopos={escopos} />
        </details>
      </div>
    </>
  );
}
