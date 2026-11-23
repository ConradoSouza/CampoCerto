import { contexto } from "@/lib/contexto";
import { corDaCultura, formatarData, formatarHa } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";
import type { Cultura, Safra, Variedade } from "@campocerto/tipos";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { removerOcupacao } from "../acoes";
import { FormCopiar, FormFaixa } from "./Formularios";

export const metadata: Metadata = { title: "Ocupação da safra" };

interface Faixa {
  id: string;
  talhao_id: string;
  area_ha: number;
  plantio_previsto: string | null;
  cultura: { nome: string } | null;
  variedade: { nome: string } | null;
}

export default async function OcupacaoSafra({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fazenda?: string }>;
}) {
  const { id } = await params;
  const ctx = await contexto();
  const supabase = await supabaseServidor();
  const { data: safra } = await supabase.from("safra").select("*").eq("id", id).maybeSingle<Safra>();
  if (!safra) notFound();

  const { fazenda: fazendaParam } = await searchParams;
  const fazenda = ctx.fazendas.find((f) => f.id === fazendaParam) ?? ctx.fazendas[0];
  if (!fazenda) {
    return <p className="vazio">Cadastre uma fazenda antes de planejar a ocupação.</p>;
  }

  const [{ data: talhoes }, { data: faixas }, { data: culturas }, { data: variedades }, { data: outras }] = await Promise.all([
    supabase.from("talhao").select("id, codigo, nome, area_ha, area_produtiva_ha").eq("fazenda_id", fazenda.id).eq("ativo", true).is("excluido_em", null).order("codigo"),
    supabase.from("ocupacao").select("id, talhao_id, area_ha, plantio_previsto, cultura:cultura_id(nome), variedade:variedade_id(nome)")
      .eq("safra_id", id).eq("fazenda_id", fazenda.id).is("excluido_em", null).order("criado_em"),
    supabase.from("cultura").select("*").eq("grupo_id", ctx.grupo.id).is("excluido_em", null).order("nome").returns<Cultura[]>(),
    supabase.from("variedade").select("*").eq("grupo_id", ctx.grupo.id).is("excluido_em", null).order("nome").returns<Variedade[]>(),
    supabase.from("safra").select("id, nome").eq("grupo_id", ctx.grupo.id).neq("id", id).is("excluido_em", null).order("inicio", { ascending: false }),
  ]);

  const lista = (faixas ?? []) as unknown as Faixa[];
  const editavel = safra.status !== "encerrada" && ctx.pode(fazenda, "cadastros", "editar");
  const linhas = (talhoes ?? []).map((t) => {
    const produtiva = Number(t.area_produtiva_ha ?? t.area_ha);
    const minhas = lista.filter((f) => f.talhao_id === t.id);
    const ocupada = minhas.reduce((s, f) => s + Number(f.area_ha), 0);
    return { ...t, produtiva, faixas: minhas, disponivel: Math.round((produtiva - ocupada) * 100) / 100 };
  });
  const totalProdutiva = linhas.reduce((s, l) => s + l.produtiva, 0);
  const totalOcupada = lista.reduce((s, f) => s + Number(f.area_ha), 0);

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>{safra.nome} <span className={`etq ${safra.status}`}>{safra.status}</span></h1>
          <p>Ocupação dos talhões de {fazenda.nome}: {formatarHa(totalOcupada)} de {formatarHa(totalProdutiva)} produtivos.</p>
        </div>
        <div className="acoes">
          {ctx.fazendas.map((f) => (
            <Link key={f.id} href={`/safras/${id}?fazenda=${f.id}`} className={`botao pequeno ${f.id === fazenda.id ? "" : "secundario"}`}>{f.sigla}</Link>
          ))}
        </div>
      </div>

      {safra.status === "encerrada" && <p className="aviso info">Safra encerrada: somente leitura. O administrador pode reabrir em Safras.</p>}
      {editavel && (culturas ?? []).length === 0 && (
        <p className="aviso info">Cadastre as culturas e variedades em <Link href="/cadastros">Cadastros</Link> para planejar a ocupação.</p>
      )}

      {editavel && (outras ?? []).length > 0 && (
        <details className="painel">
          <summary>Copiar a ocupação de outra safra</summary>
          <FormCopiar destino={id} fazenda={fazenda.id} safras={outras ?? []} />
        </details>
      )}

      <section className="caixa">
        {linhas.length === 0 ? (
          <p className="vazio">A fazenda não tem talhões ativos. <Link href={`/fazendas/${fazenda.id}`}>Importar talhões</Link>.</p>
        ) : (
          <div className="tabela">
            <table>
              <thead>
                <tr><th>Talhão</th><th className="n">Produtiva</th><th>Cultura e variedade</th><th className="n">Área</th><th>Plantio previsto</th>{editavel && <th></th>}</tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <FragmentoTalhao key={l.id} linha={l} safraId={id} editavel={editavel} culturas={culturas ?? []} variedades={variedades ?? []} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function FragmentoTalhao({
  linha,
  safraId,
  editavel,
  culturas,
  variedades,
}: {
  linha: { id: string; codigo: string; nome: string; produtiva: number; disponivel: number; faixas: Faixa[] };
  safraId: string;
  editavel: boolean;
  culturas: Cultura[];
  variedades: Variedade[];
}) {
  const vazio = linha.faixas.length === 0;
  const span = Math.max(1, linha.faixas.length) + (editavel && linha.disponivel > 0 ? 1 : 0);
  return (
    <>
      {(vazio ? [null] : linha.faixas).map((f, i) => (
        <tr key={f?.id ?? "vazio"}>
          {i === 0 && (
            <>
              <td rowSpan={span}><b>{linha.codigo}</b><br /><small style={{ color: "var(--mut)" }}>{linha.nome}</small></td>
              <td rowSpan={span} className="n">{formatarHa(linha.produtiva)}</td>
            </>
          )}
          {f ? (
            <>
              <td><i className="cor" style={{ background: corDaCultura(f.cultura?.nome) }} />{f.cultura?.nome}{f.variedade ? ` · ${f.variedade.nome}` : ""}</td>
              <td className="n">{formatarHa(Number(f.area_ha))}</td>
              <td>{formatarData(f.plantio_previsto)}</td>
              {editavel && (
                <td>
                  <form action={removerOcupacao}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="safra_id" value={safraId} />
                    <button className="botao secundario pequeno" aria-label={`Remover faixa de ${linha.codigo}`}>Remover</button>
                  </form>
                </td>
              )}
            </>
          ) : (
            <td colSpan={editavel ? 4 : 3} style={{ color: "var(--mut)" }}>Sem ocupação</td>
          )}
        </tr>
      ))}
      {editavel && linha.disponivel > 0 && (
        <tr>
          <td colSpan={4}>
            <FormFaixa safraId={safraId} talhaoId={linha.id} disponivel={linha.disponivel} culturas={culturas} variedades={variedades} />
          </td>
        </tr>
      )}
    </>
  );
}
