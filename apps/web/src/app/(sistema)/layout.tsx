import { Logo } from "@/componentes/Logo";
import { Navegacao, type ItemMenu } from "@/componentes/Navegacao";
import { contexto } from "@/lib/contexto";
import { ROTULO_PERFIL } from "@campocerto/tipos";
import Link from "next/link";
import { trocarGrupo } from "./acoes";
import { SeletorGrupo } from "./SeletorGrupo";

export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  const ctx = await contexto();
  const primeira = ctx.fazendas[0];
  const itens: ItemMenu[] = [
    { href: "/", rotulo: "Painel", icone: "painel" },
    { href: "/estrutura", rotulo: "Estrutura", icone: "estrutura" },
    { href: primeira ? `/fazendas/${primeira.id}` : "/estrutura", rotulo: "Mapa", icone: "mapa", prefixo: "/fazendas" },
    { href: "/safras", rotulo: "Safras", icone: "safras" },
    { href: "/cadastros", rotulo: "Cadastros", icone: "cadastros" },
    ...(ctx.ehAdmin ? [{ href: "/usuarios", rotulo: "Usuários", icone: "usuarios" } as ItemMenu] : []),
  ];
  const perfis = [...ctx.perfis].map((p) => ROTULO_PERFIL[p]).join(", ");

  return (
    <div className="casca">
      <aside className="lateral">
        <Link href="/" className="marca"><Logo /> Campo Certo</Link>
        <div className="grupo-atual">
          {ctx.grupos.length > 1 ? (
            <SeletorGrupo grupos={ctx.grupos.map((g) => ({ id: g.id, nome: g.nome }))} atual={ctx.grupo.id} acao={trocarGrupo} />
          ) : (
            <b>{ctx.grupo.nome}</b>
          )}
          {perfis}
        </div>
        <Navegacao itens={itens} />
        <div className="rodape">
          {ctx.usuario.nome}
          <form action="/sair" method="post">
            <button>Sair</button>
          </form>
        </div>
      </aside>
      <main className="conteudo">{children}</main>
    </div>
  );
}
