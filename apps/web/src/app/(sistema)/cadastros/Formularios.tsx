"use client";
import { Campo, Formulario } from "@/componentes/Formulario";
import { criarCultura, criarVariedade } from "./acoes";

export function FormCultura() {
  return (
    <Formulario acao={criarCultura} botao="Cadastrar cultura">
      {(estado) => (
        <Campo rotulo="Nome da cultura" nome="nome" estado={estado}>
          <input name="nome" placeholder="Ex.: Soja" required />
        </Campo>
      )}
    </Formulario>
  );
}

export function FormVariedade({ culturas }: { culturas: { id: string; nome: string }[] }) {
  return (
    <Formulario acao={criarVariedade} botao="Cadastrar variedade">
      {(estado) => (
        <div className="linha">
          <Campo rotulo="Cultura" nome="cultura_id" estado={estado}>
            <select name="cultura_id">{culturas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          </Campo>
          <Campo rotulo="Variedade ou cultivar" nome="nome" estado={estado}>
            <input name="nome" placeholder="Ex.: TMG 2383 IPRO" required />
          </Campo>
        </div>
      )}
    </Formulario>
  );
}
