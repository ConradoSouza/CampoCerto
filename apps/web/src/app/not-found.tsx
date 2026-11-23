import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="conteudo">
      <h1>Página não encontrada</h1>
      <p>Ela não existe ou você não tem acesso a essa fazenda. <Link href="/">Voltar ao painel</Link>.</p>
    </main>
  );
}
