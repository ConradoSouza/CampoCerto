"use server";
import { validarOcupacao } from "@campocerto/regras";
import { ocupacaoEntrada, safraEntrada, STATUS_SAFRA, type StatusSafra } from "@campocerto/tipos";
import { revalidatePath } from "next/cache";
import { errosDeCampo, numeroOuNulo, texto, traduzirErro, type Estado } from "@/lib/acoes";
import { contexto } from "@/lib/contexto";
import { supabaseServidor } from "@/lib/supabase/servidor";

export async function criarSafra(_: Estado, fd: FormData): Promise<Estado> {
  const ctx = await contexto();
  const r = safraEntrada.safeParse({
    grupo_id: ctx.grupo.id,
    ano_agricola: texto(fd, "ano_agricola"),
    ciclo: texto(fd, "ciclo"),
    nome: texto(fd, "nome"),
    inicio: texto(fd, "inicio"),
    fim: texto(fd, "fim"),
  });
  if (!r.success) return errosDeCampo(r.error);
  const supabase = await supabaseServidor();
  const { error } = await supabase.from("safra").insert(r.data);
  if (error) return { erro: traduzirErro(error) };
  revalidatePath("/safras");
  return { ok: `Safra ${r.data.nome} criada como planejada.` };
}

export async function mudarStatusSafra(fd: FormData) {
  const status = texto(fd, "status") as StatusSafra;
  if (!STATUS_SAFRA.includes(status)) return;
  const supabase = await supabaseServidor();
  await supabase.from("safra").update({ status }).eq("id", texto(fd, "id"));
  revalidatePath("/", "layout");
}

export async function incluirOcupacao(_: Estado, fd: FormData): Promise<Estado> {
  const r = ocupacaoEntrada.safeParse({
    safra_id: texto(fd, "safra_id"),
    talhao_id: texto(fd, "talhao_id"),
    cultura_id: texto(fd, "cultura_id"),
    variedade_id: texto(fd, "variedade_id") || null,
    area_ha: numeroOuNulo(fd, "area_ha") ?? 0,
    plantio_previsto: texto(fd, "plantio_previsto") || null,
  });
  if (!r.success) return errosDeCampo(r.error);
  const supabase = await supabaseServidor();

  const [{ data: talhao }, { data: outras }] = await Promise.all([
    supabase.from("talhao").select("area_ha, area_produtiva_ha").eq("id", r.data.talhao_id).single(),
    supabase.from("ocupacao").select("area_ha").eq("safra_id", r.data.safra_id).eq("talhao_id", r.data.talhao_id).is("excluido_em", null),
  ]);
  if (talhao) {
    const v = validarOcupacao(
      { area_ha: Number(talhao.area_ha), area_produtiva_ha: talhao.area_produtiva_ha === null ? null : Number(talhao.area_produtiva_ha) },
      (outras ?? []).map((o) => ({ area_ha: Number(o.area_ha) })),
      r.data.area_ha,
    );
    if (!v.ok) return { erro: v.mensagem, campos: { area_ha: v.mensagem } };
  }

  const { error } = await supabase.from("ocupacao").insert(r.data);
  if (error) return { erro: traduzirErro(error) };
  revalidatePath(`/safras/${r.data.safra_id}`);
  return { ok: "Faixa incluída." };
}

export async function removerOcupacao(fd: FormData) {
  const supabase = await supabaseServidor();
  await supabase.from("ocupacao").delete().eq("id", texto(fd, "id"));
  revalidatePath(`/safras/${texto(fd, "safra_id")}`);
}

export async function copiarOcupacao(_: Estado, fd: FormData): Promise<Estado> {
  const destino = texto(fd, "destino");
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc("copiar_ocupacao", {
    origem: texto(fd, "origem"),
    destino,
    fazenda: texto(fd, "fazenda") || null,
  });
  if (error) return { erro: traduzirErro(error) };
  revalidatePath(`/safras/${destino}`);
  return data ? { ok: `${data} faixas copiadas. Ajuste cultura, variedade e datas onde mudou.` } : { erro: "Nada para copiar: os talhões já têm ocupação nesta safra." };
}
