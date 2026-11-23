import { contexto } from "@/lib/contexto";
import { corDaCultura, formatarHa, formatarInteiro } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";
import type { Safra } from "@campocerto/tipos";
import Link from "next/link";

export default async function Painel() {
  const ctx = await contexto();
  const supabase = await supabaseServidor();
  const [{ data: talhoes }, { data: safras }] = await Promise.all([
    supabase.from("talhao").select("fazenda_id, area_ha, area_produtiva_ha, ativo").eq("grupo_id", ctx.grupo.id).is("excluido_em", null),
    supabase.from("safra").select("*").eq("grupo_id", ctx.grupo.id).eq("status", "aberta").is("excluido_em", null).order("inicio").returns<Safra[]>(),
  ]);
  const ativos = (talhoes ?? []).filter((t) => t.ativo);
  const areaTotal = ativos.reduce((s, t) => s + Number(t.area_ha), 0);
  const areaProdutiva = ativos.reduce((s, t) => s + Number(t.area_produtiva_ha ?? t.area_ha), 0);
  const safra = safras?.[0];

  const { data: ocupacoes } = safra
    ? await supabase.from("ocupacao").select("area_ha, cultura:cultura_id(nome)").eq("safra_id", safra.id).is("excluido_em", null)
    : { data: [] };
  const porCultura = new Map<string, number>();
  for (const o of (ocupacoes ?? []) as unknown as { area_ha: number; cultura: { nome: string } | null }[]) {
    const nome = o.cultura?.nome ?? "Sem cultura";
    porCultura.set(nome, (porCultura.get(nome) ?? 0) + Number(o.area_ha));
  }
  const ocupada = [...porCultura.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Painel</h1>
          <p>{ctx.grupo.nome}{safra ? ` · safra ${safra.nome}` : ""}</p>
        </div>
      </div>

      <section className="kpis" aria-label="Resumo">
        <div className="kpi"><div className="l">Fazendas</div><div className="v">{ctx.fazendas.length}</div></div>
        <div className="kpi"><div className="l">Talhões ativos</div><div className="v">{ativos.length}</div></div>
        <div className="kpi"><div className="l">Área produtiva</div><div className="v">{formatarInteiro(areaProdutiva)} <small>ha</small></div></div>
        <div className="kpi"><div className="l">Área total desenhada</div><div className="v">{formatarInteiro(areaTotal)} <small>ha</small></div></div>
      </section>

      <div className="duas">
        <section className="caixa">
          <h2>Fazendas</h2>
          {ctx.fazendas.length === 0 ? (
            <p className="vazio">Nenhuma fazenda ainda. <Link href="/estrutura">Cadastre a primeira</Link>.</p>
          ) : (
            <div className="tabela">
              <table>
                <thead><tr><th>Fazenda</th><th>Município</th><th className="n">Talhões</th><th className="n">Área produtiva</th></tr></thead>
                <tbody>
                  {ctx.fazendas.map((f) => {
                    const ts = ativos.filter((t) => t.fazenda_id === f.id);
                    return (
                      <tr key={f.id}>
                        <td><Link href={`/fazendas/${f.id}`}>{f.nome}</Link> <span className="etq">{f.sigla}</span></td>
                        <td>{f.municipio}/{f.uf}</td>
                        <td className="n">{ts.length}</td>
                        <td className="n">{formatarHa(ts.reduce((s, t) => s + Number(t.area_produtiva_ha ?? t.area_ha), 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="caixa">
          <h2>Ocupação da safra</h2>
          {!safra ? (
            <p className="vazio">Nenhuma safra aberta. <Link href="/safras">Abra uma safra</Link> para planejar a ocupação.</p>
          ) : porCultura.size === 0 ? (
            <p className="vazio">A safra {safra.nome} ainda não tem ocupação. <Link href={`/safras/${safra.id}`}>Planejar</Link>.</p>
          ) : (
            <>
              <div style={{ display: "flex", height: 16, borderRadius: 4, overflow: "hidden", background: "var(--soft)" }}>
                {[...porCultura].map(([nome, area]) => (
                  <span key={nome} title={nome} style={{ width: `${(area / Math.max(areaProdutiva, ocupada)) * 100}%`, background: corDaCultura(nome) }} />
                ))}
              </div>
              <table style={{ marginTop: 10 }}>
                <tbody>
                  {[...porCultura].map(([nome, area]) => (
                    <tr key={nome}><td><i className="cor" style={{ background: corDaCultura(nome) }} />{nome}</td><td className="n">{formatarHa(area)}</td></tr>
                  ))}
                  <tr><td>Sem ocupação</td><td className="n">{formatarHa(Math.max(0, areaProdutiva - ocupada))}</td></tr>
                </tbody>
              </table>
              <p style={{ margin: "10px 0 0" }}><Link href={`/safras/${safra.id}`}>Abrir a grade de ocupação</Link></p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
