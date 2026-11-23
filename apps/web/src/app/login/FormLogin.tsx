"use client";
import { useActionState } from "react";
import { entrar } from "./acoes";

export function FormLogin({ voltar }: { voltar: string }) {
  const [estado, acao, pendente] = useActionState(entrar, null);
  return (
    <form action={acao} className="form">
      <input type="hidden" name="voltar" value={voltar} />
      <label className="campo">
        E-mail
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="campo">
        Senha
        <input name="senha" type="password" autoComplete="current-password" />
        <small>Deixe em branco para receber um link de acesso por e-mail.</small>
      </label>
      {estado?.erro && <p className="aviso erro" role="alert">{estado.erro}</p>}
      {estado?.ok && <p className="aviso ok" role="status">{estado.ok}</p>}
      <button className="botao" disabled={pendente}>{pendente ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
