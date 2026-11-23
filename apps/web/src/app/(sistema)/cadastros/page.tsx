import { contexto } from "@/lib/contexto";
import { corDaCultura } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";
import type { Cultura, Variedade } from "@campocerto/tipos";
import type { Metadata } from "next";
import { FormCultura, FormVariedade } from "./Formularios";

export const metadata: Metadata = { title: "Cadastros" };

export default async function Cadastros() {
  const ctx = await contexto();
  const supabase = await supabaseServidor();
  const [{ data: culturas }, { data: variedades }] = await Promise.all([
    supabase.from("cultura").select("*").eq("grupo_id", ctx.grupo.id).is("excluido_em", null).order("nome").returns<Cultura[]>(),
    supabase.from("variedade").select("*").eq("grupo_id", ctx.grupo.id).is("excluido_em", null).order("nome").returns<Variedade[]>(),
  ]);
  const lista = culturas ?? [];

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Cadastros de apoio</h1>
          <p>Culturas e variedades usadas na ocupação das safras. Tipos de atividade, colaboradores e máquinas chegam com as ordens de serviço.</p>
        </div>
      </div>
      <div className="duas">
        <section className="caixa">
          <h2>Culturas e variedades</h2>
          {lista.length === 0 ? (
            <p className="vazio">Nenhuma cultura cadastrada.</p>
          ) : (
            <table>
              <thead><tr><th>Cultura</th><th>Variedades</th></tr></thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id}>
                    <td><i className="cor" style={{ background: corDaCultura(c.nome) }} />{c.nome}</td>
                    <td>{(variedades ?? []).filter((v) => v.cultura_id === c.id).map((v) => v.nome).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        {ctx.ehAdmin && (
          <div style={{ display: "grid", gap: 14 }}>
            <details className="painel" open={lista.length === 0}>
              <summary>Nova cultura</summary>
              <FormCultura />
            </details>
            {lista.length > 0 && (
              <details className="painel" open>
                <summary>Nova variedade</summary>
                <FormVariedade culturas={lista.map((c) => ({ id: c.id, nome: c.nome }))} />
              </details>
            )}
          </div>
        )}
      </div>
    </>
  );
}
