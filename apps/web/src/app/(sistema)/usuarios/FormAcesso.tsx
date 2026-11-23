"use client";
import { Campo, Formulario } from "@/componentes/Formulario";
import { PERFIS, ROTULO_PERFIL } from "@campocerto/tipos";
import { concederAcesso } from "./acoes";

export function FormAcesso({ escopos }: { escopos: { valor: string; rotulo: string }[] }) {
  return (
    <Formulario acao={concederAcesso} botao="Conceder acesso">
      {(estado) => (
        <>
          <Campo rotulo="E-mail" nome="email" estado={estado}>
            <input type="email" name="email" required />
          </Campo>
          <div className="linha">
            <Campo rotulo="Perfil" nome="perfil" estado={estado}>
              <select name="perfil" defaultValue="gerente">
                {PERFIS.map((p) => <option key={p} value={p}>{ROTULO_PERFIL[p]}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Onde" nome="escopo" estado={estado}>
              <select name="escopo">{escopos.map((e) => <option key={e.valor} value={e.valor}>{e.rotulo}</option>)}</select>
            </Campo>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--mut)" }}>
            Uma pessoa pode ter perfis diferentes em fazendas diferentes. O app baixa só as fazendas do escopo.
          </p>
        </>
      )}
    </Formulario>
  );
}
