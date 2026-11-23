import { contexto } from "@/lib/contexto";
import { formatarData } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { ROTULO_CICLO, type Safra } from "@campocerto/tipos";
import type { Metadata } from "next";
import Link from "next/link";
import { mudarStatusSafra } from "./acoes";
import { FormSafra } from "./FormSafra";

export const metadata: Metadata = { title: "Safras" };

const ROTULO_STATUS = { planejada: "Planejada", aberta: "Aberta", encerrada: "Encerrada" } as const;

export default async function Safras() {
  const ctx = await contexto();
  const supabase = await supabaseServidor();
  const { data } = await supabase.from("safra").select("*").eq("grupo_id", ctx.grupo.id).is("excluido_em", null)
    .order("inicio", { ascending: false }).returns<Safra[]>();
  const safras = data ?? [];

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Safras</h1>
          <p>Duas safras podem estar abertas ao mesmo tempo. Safra encerrada fica somente leitura.</p>
        </div>
      </div>
      <div className="duas">
        <section className="caixa">
          {safras.length === 0 ? (
            <p className="vazio">Nenhuma safra cadastrada.</p>
          ) : (
            <div className="tabela">
              <table>
                <thead><tr><th>Safra</th><th>Ciclo</th><th>Período</th><th>Status</th>{ctx.ehAdmin && <th></th>}</tr></thead>
                <tbody>
                  {safras.map((s) => (
                    <tr key={s.id}>
                      <td><Link href={`/safras/${s.id}`}>{s.nome}</Link><br /><small style={{ color: "var(--mut)" }}>{s.ano_agricola}</small></td>
                      <td>{ROTULO_CICLO[s.ciclo]}</td>
                      <td>{formatarData(s.inicio)} a {formatarData(s.fim)}</td>
                      <td><span className={`etq ${s.status}`}>{ROTULO_STATUS[s.status]}</span></td>
                      {ctx.ehAdmin && (
                        <td>
                          <form action={mudarStatusSafra}>
                            <input type="hidden" name="id" value={s.id} />
                            {s.status === "planejada" && <button className="botao pequeno" name="status" value="aberta">Abrir</button>}
                            {s.status === "aberta" && <button className="botao secundario pequeno" name="status" value="encerrada">Encerrar</button>}
                            {s.status === "encerrada" && <button className="botao secundario pequeno" name="status" value="aberta">Reabrir</button>}
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {ctx.ehAdmin && (
          <details className="painel" open={safras.length === 0}>
            <summary>Nova safra</summary>
            <FormSafra />
          </details>
        )}
      </div>
    </>
  );
}
