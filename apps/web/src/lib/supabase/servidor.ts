import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "../env";

/** Cliente do Supabase para Server Components e Server Actions, com a sessão do usuário. */
export async function supabaseServidor() {
  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) cookieStore.set(name, value, options);
        } catch {
          // Server Component não grava cookie; o proxy renova a sessão.
        }
      },
    },
  });
}

/** Cliente com a chave de serviço, só para convites. Retorna null se a chave não estiver configurada. */
export function supabaseServico() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) return null;
  return createClient(env.url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}
