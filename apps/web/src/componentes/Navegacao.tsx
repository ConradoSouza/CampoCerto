"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONES: Record<string, React.ReactNode> = {
  painel: <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z" />,
  estrutura: <path d="M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 18l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  mapa: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zm0 0v14m6-12v14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  safras: <path d="M12 21V9m0 0c0-3 2-5 5-5 0 3-2 5-5 5zm0 4c0-3-2-5-5-5 0 3 2 5 5 5zm0 4c0-3 2-5 5-5 0 3-2 5-5 5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  cadastros: <path d="M4 5h16M4 12h16M4 19h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  usuarios: <path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 7c0-1.7-1-3.1-2.5-3.7M17 6.2a3 3 0 0 1 0 5.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
};

export interface ItemMenu {
  href: string;
  rotulo: string;
  icone: keyof typeof ICONES;
  /** Prefixo de rota que marca o item como atual (padrão: o próprio href). */
  prefixo?: string;
}

export function Navegacao({ itens }: { itens: ItemMenu[] }) {
  const caminho = usePathname();
  return (
    <nav aria-label="Principal">
      {itens.map((i) => {
        const prefixo = i.prefixo ?? i.href;
        const ativo = prefixo === "/" ? caminho === "/" : caminho.startsWith(prefixo);
        return (
          <Link key={i.href} href={i.href} aria-current={ativo ? "page" : undefined}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{ICONES[i.icone]}</svg>
            {i.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
