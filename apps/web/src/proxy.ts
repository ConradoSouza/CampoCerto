import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "./lib/env";

const PUBLICAS = ["/login", "/auth"];

/** Renova a sessão do Supabase a cada requisição e manda para o login quem não está autenticado. */
export async function proxy(request: NextRequest) {
  if (!env.anonKey) {
    return new NextResponse(
      "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em apps/web/.env.local (veja .env.example).",
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of lista) resposta.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const caminho = request.nextUrl.pathname;
  if (!data?.claims && !PUBLICAS.some((p) => caminho.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = caminho === "/" ? "" : `?voltar=${encodeURIComponent(caminho)}`;
    return NextResponse.redirect(url);
  }
  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
