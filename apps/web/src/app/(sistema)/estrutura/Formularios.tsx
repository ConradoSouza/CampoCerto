"use client";
import { Campo, Formulario } from "@/componentes/Formulario";
import { ROTULO_TIPO_EMPRESA, TIPOS_EMPRESA, UFS } from "@campocerto/tipos";
import { criarEmpresa, criarFazenda } from "./acoes";

export function FormEmpresa() {
  return (
    <Formulario acao={criarEmpresa} botao="Cadastrar empresa">
      {(estado) => (
        <>
          <div className="linha">
            <Campo rotulo="Tipo" nome="tipo" estado={estado}>
              <select name="tipo" defaultValue="PJ">
                {TIPOS_EMPRESA.map((t) => <option key={t} value={t}>{ROTULO_TIPO_EMPRESA[t]}</option>)}
              </select>
            </Campo>
            <Campo rotulo="CPF ou CNPJ" nome="cpf_cnpj" estado={estado} dica="Aceita CNPJ com letras">
              <input name="cpf_cnpj" required aria-invalid={!!estado?.campos?.cpf_cnpj} />
            </Campo>
          </div>
          <Campo rotulo="Razão social ou nome" nome="razao_social" estado={estado}>
            <input name="razao_social" required />
          </Campo>
          <div className="linha">
            <Campo rotulo="Nome fantasia" nome="nome_fantasia" estado={estado}>
              <input name="nome_fantasia" />
            </Campo>
            <Campo rotulo="Inscrições estaduais" nome="inscricoes_estaduais" estado={estado} dica="Separe por vírgula">
              <input name="inscricoes_estaduais" />
            </Campo>
          </div>
        </>
      )}
    </Formulario>
  );
}

export function FormFazenda({ empresas }: { empresas: { id: string; nome: string }[] }) {
  return (
    <Formulario acao={criarFazenda} botao="Cadastrar fazenda">
      {(estado) => (
        <>
          <Campo rotulo="Empresa ou produtor" nome="empresa_id" estado={estado}>
            <select name="empresa_id" required>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </Campo>
          <div className="linha">
            <Campo rotulo="Nome da fazenda" nome="nome" estado={estado}>
              <input name="nome" required />
            </Campo>
            <Campo rotulo="Sigla" nome="sigla" estado={estado} dica="Entra no número da OS (SM-2026-0142)">
              <input name="sigla" required maxLength={5} style={{ textTransform: "uppercase" }} aria-invalid={!!estado?.campos?.sigla} />
            </Campo>
          </div>
          <div className="linha">
            <Campo rotulo="Município" nome="municipio" estado={estado}>
              <input name="municipio" required />
            </Campo>
            <Campo rotulo="UF" nome="uf" estado={estado}>
              <select name="uf" defaultValue="MT">
                {UFS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </Campo>
          </div>
        </>
      )}
    </Formulario>
  );
}
