"use client";
import type { Cultura, Variedade } from "@campocerto/tipos";
import { useActionState, useState } from "react";
import { copiarOcupacao, incluirOcupacao } from "../acoes";
import { Formulario } from "@/componentes/Formulario";

export function FormFaixa({
  safraId,
  talhaoId,
  disponivel,
  culturas,
  variedades,
}: {
  safraId: string;
  talhaoId: string;
  disponivel: number;
  culturas: Cultura[];
  variedades: Variedade[];
}) {
  const [cultura, setCultura] = useState(culturas[0]?.id ?? "");
  const [estado, acao, pendente] = useActionState(incluirOcupacao, null);
  if (!culturas.length) return null;
  return (
    <form action={acao} className="acoes" style={{ gap: 6 }}>
      <input type="hidden" name="safra_id" value={safraId} />
      <input type="hidden" name="talhao_id" value={talhaoId} />
      <select name="cultura_id" value={cultura} onChange={(e) => setCultura(e.target.value)} aria-label="Cultura">
        {culturas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <select name="variedade_id" aria-label="Variedade" key={cultura}>
        <option value="">Variedade…</option>
        {variedades.filter((v) => v.cultura_id === cultura).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
      </select>
      <input name="area_ha" inputMode="decimal" defaultValue={disponivel.toFixed(2).replace(".", ",")} style={{ width: 100 }} aria-label="Área em hectares" />
      <input type="date" name="plantio_previsto" aria-label="Plantio previsto" />
      <button className="botao pequeno" disabled={pendente}>{pendente ? "…" : "Incluir faixa"}</button>
      {estado?.erro && <small style={{ color: "var(--terra)", fontWeight: 600 }} role="alert">{estado.erro}</small>}
    </form>
  );
}

export function FormCopiar({ destino, fazenda, safras }: { destino: string; fazenda: string; safras: { id: string; nome: string }[] }) {
  return (
    <Formulario acao={copiarOcupacao} botao="Copiar ocupação">
      <input type="hidden" name="destino" value={destino} />
      <input type="hidden" name="fazenda" value={fazenda} />
      <label className="campo">
        Safra de origem
        <select name="origem">{safras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
        <small>Copia só para talhões ativos que ainda não têm ocupação nesta safra, nesta fazenda.</small>
      </label>
    </Formulario>
  );
}
