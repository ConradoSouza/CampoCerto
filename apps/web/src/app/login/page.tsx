import type { Metadata } from "next";
import { Logo } from "@/componentes/Logo";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: { searchParams: Promise<{ voltar?: string; erro?: string }> }) {
  const { voltar = "/", erro } = await searchParams;
  return (
    <main className="tela-login">
      <section className="faixa">
        <div className="marca" style={{ color: "var(--gink)", padding: 0 }}>
          <Logo /> Campo Certo
        </div>
        <div>
          <h1>A ordem de serviço sai do escritório, volta do campo e já baixa o estoque.</h1>
          <p>Fazendas, talhões no mapa e safras organizados para que cada apontamento chegue ao talhão certo.</p>
        </div>
        <p style={{ fontSize: 14 }}>Versão 0.1 · entrega 1: base e mapa</p>
      </section>
      <section className="lado">
        <h2 style={{ fontSize: 24 }}>Entrar</h2>
        {erro === "inativo" && <p className="aviso erro">Seu acesso foi desativado. Fale com o administrador do grupo.</p>}
        <FormLogin voltar={voltar} />
      </section>
    </main>
  );
}
