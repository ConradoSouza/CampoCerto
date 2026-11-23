"use client";
import { useActionState, type ReactNode } from "react";
import type { Estado } from "@/lib/acoes";

type Acao = (anterior: Estado, dados: FormData) => Promise<Estado>;

/** Formulário com Server Action, mensagens de erro e sucesso e botão que espera. */
export function Formulario({
  acao,
  botao,
  children,
  classe = "form",
}: {
  acao: Acao;
  botao: string;
  children: ReactNode | ((estado: Estado) => ReactNode);
  classe?: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, null);
  return (
    <form action={enviar} className={classe}>
      {typeof children === "function" ? children(estado) : children}
      {estado?.erro && <p className="aviso erro" role="alert">{estado.erro}</p>}
      {estado?.ok && <p className="aviso ok" role="status">{estado.ok}</p>}
      <div className="acoes">
        <button className="botao" disabled={pendente}>{pendente ? "Salvando…" : botao}</button>
      </div>
    </form>
  );
}

export function Campo({
  rotulo,
  nome,
  estado,
  dica,
  children,
}: {
  rotulo: string;
  nome: string;
  estado?: Estado;
  dica?: string;
  children: ReactNode;
}) {
  const erro = estado?.campos?.[nome];
  return (
    <label className="campo">
      {rotulo}
      {children}
      {dica && !erro && <small>{dica}</small>}
      {erro && <small className="erro">{erro}</small>}
    </label>
  );
}
