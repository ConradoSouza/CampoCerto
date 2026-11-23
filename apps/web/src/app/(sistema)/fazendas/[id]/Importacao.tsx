"use client";
import { lerArquivoGeografico } from "@/lib/importar-arquivo";
import { formatarHa } from "@/lib/formato";
import type { Estado } from "@/lib/acoes";
import { conflitosDeSobreposicao, extrairTalhoes, type TalhaoImportado } from "@campocerto/regras";
import { useState, useTransition } from "react";
import { importarTalhoes } from "./acoes";
import type { TalhaoTela } from "./TelaFazenda";

interface Linha extends TalhaoImportado {
  incluir: boolean;
  problema: string | null;
}

export function Importacao({
  fazendaId,
  existentes,
  aoPrever,
}: {
  fazendaId: string;
  existentes: TalhaoTela[];
  aoPrever: (t: TalhaoImportado[]) => void;
}) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [ignorados, setIgnorados] = useState(0);
  const [estado, setEstado] = useState<Estado>(null);
  const [pendente, iniciar] = useTransition();

  async function ler(arquivo: File | undefined) {
    setEstado(null);
    if (!arquivo) return;
    try {
      const r = extrairTalhoes(await lerArquivoGeografico(arquivo));
      const codigos = new Set(existentes.map((t) => t.codigo));
      const novas = r.talhoes.map((t): Linha => {
        const conflito = conflitosDeSobreposicao(t.contorno, existentes)[0];
        const problema = codigos.has(t.codigo)
          ? "Código já existe na fazenda"
          : conflito
            ? `Sobrepõe ${existentes.find((e) => e.id === conflito.id)?.codigo} em ${(conflito.fracao * 100).toFixed(1)}%`
            : null;
        return { ...t, incluir: !problema, problema };
      });
      setLinhas(novas);
      setIgnorados(r.ignorados.length);
      aoPrever(novas);
      if (!novas.length) setEstado({ erro: "Nenhum polígono encontrado no arquivo." });
    } catch (e) {
      setEstado({ erro: e instanceof Error ? e.message : "Não foi possível ler o arquivo." });
    }
  }

  function alterar(i: number, campo: "codigo" | "nome" | "incluir", valor: string | boolean) {
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
  }

  function salvar() {
    const escolhidas = linhas.filter((l) => l.incluir).map(({ codigo, nome, contorno, area_ha }) => ({ codigo, nome, contorno, area_ha }));
    iniciar(async () => {
      const r = await importarTalhoes(fazendaId, escolhidas);
      setEstado(r);
      if (r?.ok) {
        setLinhas([]);
        aoPrever([]);
      }
    });
  }

  return (
    <details className="painel" open={existentes.length === 0}>
      <summary>Importar talhões (KML, GeoJSON ou Shapefile)</summary>
      <div className="form">
        <label className="campo">
          Arquivo
          <input type="file" accept=".kml,.geojson,.json,.zip" onChange={(e) => ler(e.target.files?.[0])} />
          <small>Exportado do Google Earth, FieldView, Operations Center ou do agrônomo. Shapefile vai compactado em .zip.</small>
        </label>
        {linhas.length > 0 && (
          <>
            <p style={{ margin: 0, fontSize: 14 }}>
              {linhas.length} polígonos lidos{ignorados ? `, ${ignorados} itens ignorados (pontos ou linhas)` : ""}. Confira código e nome antes de salvar.
            </p>
            <div className="tabela" style={{ maxHeight: 320, overflowY: "auto" }}>
              <table>
                <thead><tr><th></th><th>Código</th><th>Nome</th><th className="n">Área</th></tr></thead>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={i}>
                      <td><input type="checkbox" checked={l.incluir} onChange={(e) => alterar(i, "incluir", e.target.checked)} aria-label={`Incluir ${l.codigo}`} /></td>
                      <td><input value={l.codigo} onChange={(e) => alterar(i, "codigo", e.target.value)} style={{ width: 80 }} aria-label="Código" /></td>
                      <td>
                        <input value={l.nome} onChange={(e) => alterar(i, "nome", e.target.value)} aria-label="Nome" />
                        {l.problema && <small style={{ display: "block", color: "var(--terra)" }}>{l.problema}</small>}
                      </td>
                      <td className="n">{formatarHa(l.area_ha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="acoes">
              <button className="botao" type="button" disabled={pendente} onClick={salvar}>
                {pendente ? "Salvando…" : `Salvar ${linhas.filter((l) => l.incluir).length} talhões`}
              </button>
              <button className="botao secundario" type="button" onClick={() => { setLinhas([]); aoPrever([]); }}>Descartar</button>
            </div>
          </>
        )}
        {estado?.erro && <p className="aviso erro" role="alert">{estado.erro}</p>}
        {estado?.ok && <p className="aviso ok" role="status">{estado.ok}</p>}
      </div>
    </details>
  );
}
