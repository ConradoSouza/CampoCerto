"use server";
import { revalidatePath } from "next/cache";
import { texto, traduzirErro, type Estado } from "@/lib/acoes";
import { contexto } from "@/lib/contexto";
import { supabaseServidor } from "@/lib/supabase/servidor";

export async function criarCultura(_: Estado, fd: FormData): Promise<Estado> {
  const ctx = await contexto();
  const nome = texto(fd, "nome");
  if (!nome) return { erro: "Informe o nome.", campos: { nome: "Obrigatório" } };
  const supabase = await supabaseServidor();
  const { error } = await supabase.from("cultura").insert({ grupo_id: ctx.grupo.id, nome });
  if (error) return { erro: error.code === "23505" ? "Essa cultura já existe." : traduzirErro(error) };
  revalidatePath("/cadastros");
  return { ok: `${nome} cadastrada.` };
}

export async function criarVariedade(_: Estado, fd: FormData): Promise<Estado> {
  const nome = texto(fd, "nome");
  if (!nome) return { erro: "Informe o nome.", campos: { nome: "Obrigatório" } };
  const supabase = await supabaseServidor();
  const { error } = await supabase.from("variedade").insert({ cultura_id: texto(fd, "cultura_id"), nome });
  if (error) return { erro: error.code === "23505" ? "Essa variedade já existe nesta cultura." : traduzirErro(error) };
  revalidatePath("/cadastros");
  return { ok: `${nome} cadastrada.` };
}
