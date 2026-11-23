import { Formulario } from "@/componentes/Formulario";
import { Logo } from "@/componentes/Logo";
import type { Estado } from "@/lib/acoes";
import { texto, traduzirErro } from "@/lib/acoes";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { redirect } from "next/navigation";

async function criar(_: Estado, fd: FormData): Promise<Estado> {
  "use server";
  const nome = texto(fd, "nome");
  if (!nome) return { erro: "Informe o nome do grupo.", campos: { nome: "Obrigatório" } };
  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc("criar_grupo", { nome });
  if (error) return { erro: traduzirErro(error) };
  redirect("/estrutura");
}

export default async function PrimeiroAcesso() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from("grupo").select("id").limit(1);
  if (data?.length) redirect("/");
  return (
    <main className="tela-login">
      <section className="faixa">
        <div className="marca" style={{ color: "var(--gink)", padding: 0 }}><Logo /> Campo Certo</div>
        <div>
          <h1>Comece pelo grupo</h1>
          <p>O grupo reúne as empresas e produtores (CPF e CNPJ) e as fazendas que vocês administram. Você será o administrador.</p>
        </div>
        <span />
      </section>
      <section className="lado">
        <h2 style={{ fontSize: 24 }}>Criar o grupo</h2>
        <p style={{ color: "var(--mut)", margin: 0 }}>
          Se você foi convidado para um grupo que já existe, peça ao administrador para liberar seu acesso.
        </p>
        <Formulario acao={criar} botao="Criar grupo">
          <label className="campo">
            Nome do grupo
            <input name="nome" placeholder="Ex.: Grupo Santa Maria" required />
          </label>
        </Formulario>
      </section>
    </main>
  );
}
