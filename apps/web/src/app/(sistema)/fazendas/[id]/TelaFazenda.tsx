"use client";
import { Campo, Formulario } from "@/componentes/Formulario";
import { Mapa } from "@/componentes/Mapa";
import { formatarData, formatarHa } from "@/lib/formato";
import { POSSES, ROTULO_POSSE, type Posse } from "@campocerto/tipos";
import type { MultiPolygon } from "geojson";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { salvarTalhao } from "./acoes";
import { Importacao } from "./Importacao";

export interface TalhaoTela {
  id: string;
  codigo: string;
  nome: string;
  area_ha: number;
  area_produtiva_ha: number | null;
  posse: Posse;
  ativo: boolean;
  contorno: MultiPolygon;
  cultura: string | null;
  cor: string;
}

export interface OcupacaoTela {
  talhao_id: string;
  safra_id: string;
  safra: string;
  area_ha: number;
  cultura: string;
  variedade: string | null;
  plantio_previsto: string | null;
}

export function TelaFazenda({
  fazendaId,
  talhoes,
  ocupacoes,
  safras,
  safraId,
  podeEditar,
}: {
  fazendaId: string;
  talhoes: TalhaoTela[];
  ocupacoes: OcupacaoTela[];
  safras: { id: string; nome: string }[];
  safraId: string | null;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [previa, setPrevia] = useState<TalhaoTela[]>([]);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const visiveis = useMemo(() => talhoes.filter((t) => mostrarInativos || t.ativo), [talhoes, mostrarInativos]);
  const talhao = talhoes.find((t) => t.id === selecionado) ?? null;
  const legenda = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of talhoes) if (t.ativo) m.set(t.cultura ?? "Sem ocupação", t.cor);
    return [...m];
  }, [talhoes]);

  return (
    <div className="duas">
      <section className="caixa" style={{ padding: 10 }}>
        <div className="acoes" style={{ marginBottom: 8, justifyContent: "space-between" }}>
          <label className="acoes" style={{ fontSize: 14 }}>
            Cores da safra
            <select
              value={safraId ?? ""}
              onChange={(e) => router.push(`${caminho}?safra=${e.target.value}`)}
              aria-label="Safra exibida no mapa"
            >
              {safras.length === 0 && <option value="">Nenhuma safra</option>}
              {safras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 14 }}>
            <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} /> Mostrar desativados
          </label>
        </div>
        <Mapa talhoes={visiveis} previa={previa} selecionado={selecionado} aoSelecionar={setSelecionado} />
        <div className="legenda">
          {legenda.map(([nome, cor]) => <span key={nome}><i className="cor" style={{ background: cor }} />{nome}</span>)}
          {previa.length > 0 && <span><i className="cor" style={{ background: "#e6c35c" }} />Importação (não salva)</span>}
        </div>
      </section>

      <div style={{ display: "grid", gap: 14 }}>
        {talhao ? (
          <DetalheTalhao
            key={talhao.id}
            fazendaId={fazendaId}
            talhao={talhao}
            historico={ocupacoes.filter((o) => o.talhao_id === talhao.id)}
            podeEditar={podeEditar}
            fechar={() => setSelecionado(null)}
          />
        ) : (
          <section className="caixa">
            <h2>Talhões</h2>
            {talhoes.length === 0 ? (
              <p className="vazio">Nenhum talhão ainda. {podeEditar ? "Importe os contornos abaixo." : ""}</p>
            ) : (
              <div className="tabela" style={{ maxHeight: 420, overflowY: "auto" }}>
                <table>
                  <thead><tr><th>Código</th><th>Nome</th><th>Cultura</th><th className="n">Área produtiva</th></tr></thead>
                  <tbody>
                    {visiveis.map((t) => (
                      <tr key={t.id} className={t.ativo ? "" : "inativo"} onClick={() => setSelecionado(t.id)} style={{ cursor: "pointer" }}>
                        <td><button className="botao secundario pequeno" onClick={() => setSelecionado(t.id)}>{t.codigo}</button></td>
                        <td>{t.nome}{!t.ativo && " (desativado)"}</td>
                        <td><i className="cor" style={{ background: t.cor }} />{t.cultura ?? "—"}</td>
                        <td className="n">{formatarHa(t.area_produtiva_ha ?? t.area_ha)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={3}>Total ativo</th>
                      <th className="n">{formatarHa(talhoes.filter((t) => t.ativo).reduce((s, t) => s + (t.area_produtiva_ha ?? t.area_ha), 0))}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        )}
        {podeEditar && (
          <Importacao
            fazendaId={fazendaId}
            existentes={talhoes.filter((t) => t.ativo)}
            aoPrever={(lista) => setPrevia(lista.map((t, i) => ({ ...t, id: `previa-${i}`, area_produtiva_ha: null, posse: "propria", ativo: true, cultura: null, cor: "#e6c35c" })))}
          />
        )}
      </div>
    </div>
  );
}

function DetalheTalhao({
  fazendaId,
  talhao,
  historico,
  podeEditar,
  fechar,
}: {
  fazendaId: string;
  talhao: TalhaoTela;
  historico: OcupacaoTela[];
  podeEditar: boolean;
  fechar: () => void;
}) {
  return (
    <section className="caixa">
      <div className="acoes" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <h2>Talhão {talhao.codigo}</h2>
        <button className="botao secundario pequeno" onClick={fechar}>Voltar à lista</button>
      </div>
      <p style={{ margin: "0 0 12px", color: "var(--mut)" }}>
        Área do desenho: <b>{formatarHa(talhao.area_ha)}</b> (calculada do contorno)
      </p>
      {podeEditar ? (
        <Formulario acao={salvarTalhao} botao="Salvar talhão">
          {(estado) => (
            <>
              <input type="hidden" name="id" value={talhao.id} />
              <input type="hidden" name="fazenda_id" value={fazendaId} />
              <input type="hidden" name="area_ha" value={talhao.area_ha} />
              <div className="linha">
                <Campo rotulo="Código" nome="codigo" estado={estado} dica="Não muda depois de ter OS">
                  <input name="codigo" defaultValue={talhao.codigo} required maxLength={20} />
                </Campo>
                <Campo rotulo="Nome" nome="nome" estado={estado}>
                  <input name="nome" defaultValue={talhao.nome} required />
                </Campo>
              </div>
              <div className="linha">
                <Campo rotulo="Área produtiva (ha)" nome="area_produtiva_ha" estado={estado} dica="Até a área do desenho">
                  <input name="area_produtiva_ha" inputMode="decimal" defaultValue={talhao.area_produtiva_ha?.toString().replace(".", ",") ?? ""} aria-invalid={!!estado?.campos?.area_produtiva_ha} />
                </Campo>
                <Campo rotulo="Posse" nome="posse" estado={estado}>
                  <select name="posse" defaultValue={talhao.posse}>
                    {POSSES.map((p) => <option key={p} value={p}>{ROTULO_POSSE[p]}</option>)}
                  </select>
                </Campo>
              </div>
              <label style={{ fontSize: 15 }}>
                <input type="checkbox" name="ativo" defaultChecked={talhao.ativo} /> Talhão ativo
                <small style={{ display: "block", color: "var(--mut)" }}>Talhão com histórico não é excluído, é desativado.</small>
              </label>
            </>
          )}
        </Formulario>
      ) : (
        <p>{talhao.nome} · {ROTULO_POSSE[talhao.posse]} · área produtiva {formatarHa(talhao.area_produtiva_ha)}</p>
      )}
      <h3 style={{ marginTop: 18 }}>Histórico de safras</h3>
      {historico.length === 0 ? (
        <p style={{ color: "var(--mut)" }}>Sem ocupação registrada.</p>
      ) : (
        <table>
          <thead><tr><th>Safra</th><th>Cultura</th><th className="n">Área</th><th>Plantio previsto</th></tr></thead>
          <tbody>
            {historico.map((o, i) => (
              <tr key={i}>
                <td>{o.safra}</td>
                <td>{o.cultura}{o.variedade ? ` · ${o.variedade}` : ""}</td>
                <td className="n">{formatarHa(o.area_ha)}</td>
                <td>{formatarData(o.plantio_previsto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ color: "var(--mut)", fontSize: 14, marginBottom: 0 }}>O histórico de ordens de serviço aparece aqui a partir da entrega 2.</p>
    </section>
  );
}
