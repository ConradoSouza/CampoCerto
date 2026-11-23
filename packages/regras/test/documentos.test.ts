import { describe, expect, it } from "vitest";
import { formatarDocumento, validarCnpj, validarCpf, validarDocumentoEmpresa } from "../src";

describe("CPF", () => {
  it("aceita CPF válido com ou sem máscara", () => {
    expect(validarCpf("529.982.247-25")).toBe(true);
    expect(validarCpf("52998224725")).toBe(true);
  });
  it("recusa dígito errado, tamanho errado e sequência repetida", () => {
    expect(validarCpf("529.982.247-24")).toBe(false);
    expect(validarCpf("5299822472")).toBe(false);
    expect(validarCpf("111.111.111-11")).toBe(false);
  });
});

describe("CNPJ", () => {
  it("aceita CNPJ numérico", () => {
    expect(validarCnpj("11.222.333/0001-81")).toBe(true);
  });
  it("aceita CNPJ alfanumérico (exemplo da Receita Federal)", () => {
    expect(validarCnpj("12.ABC.345/01DE-35")).toBe(true);
    expect(validarCnpj("12abc34501de35")).toBe(true);
  });
  it("recusa dígito errado e letras nos verificadores", () => {
    expect(validarCnpj("11.222.333/0001-80")).toBe(false);
    expect(validarCnpj("12ABC34501DE3A")).toBe(false);
    expect(validarCnpj("00000000000000")).toBe(false);
  });
});

describe("documento da empresa", () => {
  it("PF usa CPF; PJ e condomínio usam CNPJ", () => {
    expect(validarDocumentoEmpresa("PF", "52998224725")).toBe(true);
    expect(validarDocumentoEmpresa("PJ", "52998224725")).toBe(false);
    expect(validarDocumentoEmpresa("condominio", "11222333000181")).toBe(true);
  });
  it("formata", () => {
    expect(formatarDocumento("52998224725")).toBe("529.982.247-25");
    expect(formatarDocumento("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });
});
