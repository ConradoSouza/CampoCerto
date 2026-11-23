"use client";
import { Campo, Formulario } from "@/componentes/Formulario";
import { CICLOS, ROTULO_CICLO } from "@campocerto/tipos";
import { criarSafra } from "./acoes";

export function FormSafra() {
  const ano = new Date().getFullYear();
  return (
    <Formulario acao={criarSafra} botao="Criar safra">
      {(estado) => (
        <>
          <div className="linha">
            <Campo rotulo="Ano agrícola" nome="ano_agricola" estado={estado} dica="Ex.: 2026/27">
              <input name="ano_agricola" defaultValue={`${ano}/${String(ano + 1).slice(2)}`} required />
            </Campo>
            <Campo rotulo="Ciclo" nome="ciclo" estado={estado}>
              <select name="ciclo">{CICLOS.map((c) => <option key={c} value={c}>{ROTULO_CICLO[c]}</option>)}</select>
            </Campo>
          </div>
          <Campo rotulo="Nome" nome="nome" estado={estado}>
            <input name="nome" placeholder={`Soja ${ano}/${String(ano + 1).slice(2)}`} required />
          </Campo>
          <div className="linha">
            <Campo rotulo="Início" nome="inicio" estado={estado}><input type="date" name="inicio" required /></Campo>
            <Campo rotulo="Fim" nome="fim" estado={estado}><input type="date" name="fim" required /></Campo>
          </div>
        </>
      )}
    </Formulario>
  );
}
