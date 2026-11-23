"use server";
import { validarDocumentoEmpresa, limparDocumento } from "@campocerto/regras";
import { empresaEntrada, fazendaEntrada } from "@campocerto/tipos";
import { revalidatePath } from "next/cache";
import { errosDeCampo, texto, traduzirErro, type Estado } from "@/lib/acoes";
import { contexto } from "@/lib/contexto";
import { supabaseServidor } from "@/lib/supabase/servidor";

export async function criarEmpresa(_: Estado, fd: FormData): Promise<Estado> {
  const ctx = await contexto();
  const r = empresaEntrada.safeParse({
    grupo_id: ctx.grupo.id,
    tipo: texto(fd, "tipo"),
    cpf_cnpj: texto(fd, "cpf_cnpj"),
    razao_social: texto(fd, "razao_social"),
    nome_fantasia: texto(fd, "nome_fantasia") || null,
    inscricoes_estaduais: texto(fd, "inscricoes_estaduais").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
  });
  if (!r.success) return errosDeCampo(r.error);
  if (!validarDocumentoEmpresa(r.data.tipo, r.data.cpf_cnpj)) {
    const doc = r.data.tipo === "PF" ? "CPF" : "CNPJ";
    return { erro: `${doc} inválido.`, campos: { cpf_cnpj: `${doc} inválido` } };
  }
  const supabase = await supabaseServidor();
  const { error } = await supabase.from("empresa").insert({ ...r.data, cpf_cnpj: limparDocumento(r.data.cpf_cnpj) });
  if (error) return { erro: traduzirErro(error) };
  revalidatePath("/estrutura");
  return { ok: `${r.data.razao_social} cadastrada.` };
}

export async function criarFazenda(_: Estado, fd: FormData): Promise<Estado> {
  const r = fazendaEntrada.safeParse({
    empresa_id: texto(fd, "empresa_id"),
    nome: texto(fd, "nome"),
    sigla: texto(fd, "sigla"),
    municipio: texto(fd, "municipio"),
    uf: texto(fd, "uf").toUpperCase(),
  });
  if (!r.success) return errosDeCampo(r.error);
  const supabase = await supabaseServidor();
  const { error } = await supabase.from("fazenda").insert(r.data);
  if (error) return { erro: traduzirErro(error) };
  revalidatePath("/", "layout");
  return { ok: `${r.data.nome} cadastrada. Agora desenhe ou importe os talhões no mapa.` };
}
