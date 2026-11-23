"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Estado } from "@/lib/acoes";
import { texto } from "@/lib/acoes";
import { supabaseServidor } from "@/lib/supabase/servidor";

function destinoSeguro(v: string): string {
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export async function entrar(_: Estado, fd: FormData): Promise<Estado> {
  const email = texto(fd, "email");
  const senha = texto(fd, "senha");
  const supabase = await supabaseServidor();

  if (!senha) {
    const origem = (await headers()).get("origin") ?? "";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${origem}/auth/confirmar` },
    });
    if (error) return { erro: "Não foi possível enviar o link. Confira o e-mail." };
    return { ok: `Enviamos um link de acesso para ${email}.` };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha não conferem." };
  redirect(destinoSeguro(texto(fd, "voltar")));
}
