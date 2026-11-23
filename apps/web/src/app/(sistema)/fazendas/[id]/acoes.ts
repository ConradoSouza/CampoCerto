"use server";
import { validarAreaProdutiva, type TalhaoImportado } from "@campocerto/regras";
import { talhaoAtributos } from "@campocerto/tipos";
import { revalidatePath } from "next/cache";
import { errosDeCampo, numeroOuNulo, texto, traduzirErro, type Estado } from "@/lib/acoes";
import { supabaseServidor } from "@/lib/supabase/servidor";

export async function importarTalhoes(fazendaId: string, talhoes: TalhaoImportado[]): Promise<Estado> {
  if (talhoes.length === 0) return { erro: "Nenhum talhão para salvar." };
  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc("salvar_talhoes", {
    fazenda: fazendaId,
    talhoes: talhoes.map((t) => ({ codigo: t.codigo, nome: t.nome, contorno: t.contorno })),
  });
  if (error) return { erro: traduzirErro(error) };
  revalidatePath(`/fazendas/${fazendaId}`);
  return { ok: `${talhoes.length} talhões importados.` };
}

export async function salvarTalhao(_: Estado, fd: FormData): Promise<Estado> {
  const id = texto(fd, "id");
  const fazendaId = texto(fd, "fazenda_id");
  const areaHa = Number(texto(fd, "area_ha"));
  const r = talhaoAtributos.safeParse({
    codigo: texto(fd, "codigo"),
    nome: texto(fd, "nome"),
    area_produtiva_ha: numeroOuNulo(fd, "area_produtiva_ha"),
    posse: texto(fd, "posse"),
    ativo: fd.get("ativo") === "on",
  });
  if (!r.success) return errosDeCampo(r.error);
  const erroArea = validarAreaProdutiva(areaHa, r.data.area_produtiva_ha);
  if (erroArea) return { erro: erroArea, campos: { area_produtiva_ha: erroArea } };

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.from("talhao").update(r.data).eq("id", id).select("id");
  if (error) return { erro: traduzirErro(error) };
  if (!data?.length) return { erro: "Você não tem permissão para alterar talhões desta fazenda." };
  revalidatePath(`/fazendas/${fazendaId}`);
  return { ok: "Talhão salvo." };
}
