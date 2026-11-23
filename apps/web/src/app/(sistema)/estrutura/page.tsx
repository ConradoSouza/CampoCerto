import { contexto } from "@/lib/contexto";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { formatarDocumento } from "@campocerto/regras";
import { ROTULO_TIPO_EMPRESA, type Empresa } from "@campocerto/tipos";
import type { Metadata } from "next";
import Link from "next/link";
import { FormEmpresa, FormFazenda } from "./Formularios";

export const metadata: Metadata = { title: "Estrutura do grupo" };

export default async function Estrutura() {
  const ctx = await contexto();
  const supabase = await supabaseServidor();
  const { data: empresas } = await supabase
    .from("empresa").select("*").eq("grupo_id", ctx.grupo.id).is("excluido_em", null).order("razao_social").returns<Empresa[]>();
  const lista = empresas ?? [];

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Estrutura do grupo</h1>
          <p>{ctx.grupo.nome}: empresas e produtores, e as fazendas de cada um.</p>
        </div>
      </div>

      <div className="duas">
        <section className="caixa">
          <h2>Empresas, produtores e fazendas</h2>
          {lista.length === 0 && <p className="vazio">Cadastre a primeira empresa ou produtor ao lado.</p>}
          {lista.map((e) => {
            const fazendas = ctx.fazendas.filter((f) => f.empresa_id === e.id);
            return (
              <div key={e.id} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
                <h3>{e.nome_fantasia || e.razao_social}</h3>
                <p style={{ margin: "2px 0 6px", color: "var(--mut)", fontSize: 14 }}>
                  {ROTULO_TIPO_EMPRESA[e.tipo]} · {formatarDocumento(e.cpf_cnpj)}
                  {e.nome_fantasia ? ` · ${e.razao_social}` : ""}
                  {e.inscricoes_estaduais.length ? ` · IE ${e.inscricoes_estaduais.join(", ")}` : ""}
                </p>
                {fazendas.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 14, color: "var(--mut)" }}>Sem fazendas.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {fazendas.map((f) => (
                      <li key={f.id}>
                        <Link href={`/fazendas/${f.id}`}>{f.nome}</Link> <span className="etq">{f.sigla}</span>{" "}
                        <span style={{ color: "var(--mut)" }}>{f.municipio}/{f.uf}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        {ctx.ehAdmin ? (
          <div style={{ display: "grid", gap: 14 }}>
            <details className="painel" open={lista.length === 0}>
              <summary>Nova empresa ou produtor</summary>
              <FormEmpresa />
            </details>
            {lista.length > 0 && (
              <details className="painel" open={ctx.fazendas.length === 0}>
                <summary>Nova fazenda</summary>
                <FormFazenda empresas={lista.map((e) => ({ id: e.id, nome: e.nome_fantasia || e.razao_social }))} />
              </details>
            )}
          </div>
        ) : (
          <p className="aviso info">Só o administrador do grupo cadastra empresas e fazendas.</p>
        )}
      </div>
    </>
  );
}
