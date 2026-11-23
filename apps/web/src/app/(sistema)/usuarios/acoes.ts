"use server";
import { ESCOPOS, PERFIS, type Escopo, type Perfil } from "@campocerto/tipos";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { texto, traduzirErro, type Estado } from "@/lib/acoes";
import { contexto } from "@/lib/contexto";
import { supabaseServico, supabaseServidor } from "@/lib/supabase/servidor";

export async function concederAcesso(_: Estado, fd: FormData): Promise<Estado> {
  const ctx = await contexto();
  if (!ctx.ehAdmin) return { erro: "Só o administrador do grupo concede acesso." };
  const email = texto(fd, "email").toLowerCase();
  const perfil = texto(fd, "perfil") as Perfil;
  const [escopo, escopoId] = texto(fd, "escopo").split(":") as [Escopo, string];
  if (!email.includes("@")) return { erro: "Informe um e-mail válido.", campos: { email: "E-mail inválido" } };
  if (!PERFIS.includes(perfil) || !ESCOPOS.includes(escopo)) return { erro: "Perfil ou escopo inválido." };

  const supabase = await supabaseServidor();
  const args = { email, perfil, escopo, escopo_id: escopoId };
  let { error } = await supabase.rpc("conceder_permissao", args);
  let convidado = false;

  if (error?.code === "P0002") {
    const servico = supabaseServico();
    if (!servico) {
      return { erro: `${email} ainda não tem login. Peça para a pessoa entrar uma vez pelo link de acesso e tente de novo.` };
    }
    const origem = (await headers()).get("origin") ?? "";
    const convite = await servico.auth.admin.inviteUserByEmail(email, { redirectTo: `${origem}/auth/confirmar` });
    if (convite.error) return { erro: `Não foi possível convidar ${email}: ${convite.error.message}` };
    convidado = true;
    ({ error } = await supabase.rpc("conceder_permissao", args));
  }
  if (error) return { erro: traduzirErro(error) };
  revalidatePath("/usuarios");
  return { ok: convidado ? `Convite enviado para ${email}.` : `Acesso concedido a ${email}.` };
}

export async function revogarAcesso(fd: FormData) {
  const supabase = await supabaseServidor();
  await supabase.from("permissao").update({ excluido_em: new Date().toISOString() }).eq("id", texto(fd, "id"));
  revalidatePath("/usuarios");
}

export async function alternarUsuario(fd: FormData) {
  const supabase = await supabaseServidor();
  await supabase.rpc("definir_usuario_ativo", { usuario: texto(fd, "id"), ativo: texto(fd, "ativo") === "true" });
  revalidatePath("/usuarios");
}
