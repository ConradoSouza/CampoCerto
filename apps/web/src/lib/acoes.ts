import type { PostgrestError } from "@supabase/supabase-js";
import type { z } from "zod";

/** Resultado de uma Server Action usada com useActionState. */
export type Estado = { erro?: string; ok?: string; campos?: Record<string, string> } | null;

/** Converte erros do Postgres/PostgREST em mensagens para quem usa o sistema. */
export function traduzirErro(e: PostgrestError | null | undefined): string | undefined {
  if (!e) return undefined;
  switch (e.code) {
    case "42501":
      return "Você não tem permissão para fazer isso nesta fazenda.";
    case "23505":
      if (e.message.includes("sigla")) return "Já existe uma fazenda com essa sigla no grupo.";
      if (e.message.includes("codigo")) return "Já existe um talhão com esse código na fazenda.";
      if (e.message.includes("documento")) return "Já existe uma empresa com esse CPF ou CNPJ no grupo.";
      return "Já existe um registro com esses dados.";
    case "23514":
      if (e.message.includes("empresa_documento_valido")) return "CPF ou CNPJ inválido.";
      if (e.message.includes("talhao_area_produtiva")) return "A área produtiva não pode passar da área do desenho.";
      return e.message.includes("violates check constraint") ? "Dados fora das regras do cadastro." : e.message;
    case "22P02":
      return "Algum valor está em formato inválido.";
    default:
      return e.message;
  }
}

export function errosDeCampo(erro: z.ZodError): Estado {
  const campos: Record<string, string> = {};
  for (const i of erro.issues) campos[String(i.path[0] ?? "")] ??= i.message;
  return { erro: "Confira os campos destacados.", campos };
}

export function texto(fd: FormData, nome: string): string {
  return String(fd.get(nome) ?? "").trim();
}

export function numeroOuNulo(fd: FormData, nome: string): number | null {
  const v = texto(fd, nome).replace(/\./g, "").replace(",", ".");
  return v === "" ? null : Number(v);
}
