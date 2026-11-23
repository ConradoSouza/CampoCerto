import { contexto } from "@/lib/contexto";
import { corDaCultura } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";
import type { Safra } from "@campocerto/tipos";
import type { MultiPolygon } from "geojson";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TelaFazenda, type OcupacaoTela, type TalhaoTela } from "./TelaFazenda";

export const metadata: Metadata = { title: "Mapa da fazenda" };

export default async function Fazenda({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ safra?: string }>;
}) {
  const { id } = await params;
  const ctx = await contexto();
  const fazenda = ctx.fazendas.find((f) => f.id === id);
  if (!fazenda) notFound();

  const supabase = await supabaseServidor();
  const [{ data: talhoes }, { data: safras }] = await Promise.all([
    supabase
      .from("talhao")
      .select("id, codigo, nome, area_ha, area_produtiva_ha, posse, ativo, geojson")
      .eq("fazenda_id", id)
      .is("excluido_em", null)
      .order("codigo"),
    supabase.from("safra").select("*").eq("grupo_id", ctx.grupo.id).is("excluido_em", null).order("inicio", { ascending: false }).returns<Safra[]>(),
  ]);

  const listaSafras = safras ?? [];
  const { safra: safraParam } = await searchParams;
  const safra = listaSafras.find((s) => s.id === safraParam) ?? listaSafras.find((s) => s.status === "aberta") ?? listaSafras[0];

  const { data: ocupacoes } = await supabase
    .from("ocupacao")
    .select("talhao_id, safra_id, area_ha, plantio_previsto, cultura:cultura_id(nome), variedade:variedade_id(nome)")
    .eq("fazenda_id", id)
    .is("excluido_em", null);

  const todas: OcupacaoTela[] = ((ocupacoes ?? []) as unknown as {
    talhao_id: string; safra_id: string; area_ha: number; plantio_previsto: string | null;
    cultura: { nome: string } | null; variedade: { nome: string } | null;
  }[]).map((o) => ({
    talhao_id: o.talhao_id,
    safra_id: o.safra_id,
    safra: listaSafras.find((s) => s.id === o.safra_id)?.nome ?? "",
    area_ha: Number(o.area_ha),
    cultura: o.cultura?.nome ?? "",
    variedade: o.variedade?.nome ?? null,
    plantio_previsto: o.plantio_previsto,
  }));

  const lista: TalhaoTela[] = (talhoes ?? []).map((t) => {
    const daSafra = todas.filter((o) => o.talhao_id === t.id && o.safra_id === safra?.id);
    const principal = [...daSafra].sort((a, b) => b.area_ha - a.area_ha)[0];
    return {
      id: t.id,
      codigo: t.codigo,
      nome: t.nome,
      area_ha: Number(t.area_ha),
      area_produtiva_ha: t.area_produtiva_ha === null ? null : Number(t.area_produtiva_ha),
      posse: t.posse,
      ativo: t.ativo,
      contorno: t.geojson as MultiPolygon,
      cultura: principal?.cultura ?? null,
      cor: t.ativo ? corDaCultura(principal?.cultura) : "#6b6b6b",
    };
  });

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>{fazenda.nome} <span className="etq">{fazenda.sigla}</span></h1>
          <p>{fazenda.municipio}/{fazenda.uf} · {lista.filter((t) => t.ativo).length} talhões ativos</p>
        </div>
        <div className="acoes">
          {ctx.fazendas.length > 1 && (
            <nav className="acoes" aria-label="Outras fazendas">
              {ctx.fazendas.filter((f) => f.id !== id).map((f) => (
                <Link key={f.id} className="botao secundario pequeno" href={`/fazendas/${f.id}`}>{f.sigla}</Link>
              ))}
            </nav>
          )}
        </div>
      </div>
      <TelaFazenda
        fazendaId={id}
        talhoes={lista}
        ocupacoes={todas}
        safras={listaSafras.map((s) => ({ id: s.id, nome: s.nome }))}
        safraId={safra?.id ?? null}
        podeEditar={ctx.pode(fazenda, "cadastros", "editar")}
      />
    </>
  );
}
