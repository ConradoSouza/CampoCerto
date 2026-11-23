/**
 * Validação de CPF e CNPJ.
 *
 * O CNPJ aceita o formato alfanumérico da Receita Federal (IN RFB 2.229/2024),
 * em uso desde julho de 2026: as 12 primeiras posições podem ter letras e os
 * dois dígitos verificadores continuam numéricos. Cada caractere vale o seu
 * código ASCII menos 48, o que mantém o cálculo antigo para CNPJs só com números.
 */

export function limparDocumento(valor: string): string {
  return valor.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function todosIguais(s: string): boolean {
  return s.split("").every((c) => c === s[0]);
}

export function validarCpf(valor: string): boolean {
  const cpf = limparDocumento(valor);
  if (!/^\d{11}$/.test(cpf) || todosIguais(cpf)) return false;
  const digitos = cpf.split("").map(Number);
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += digitos[i]! * (tamanho + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== digitos[tamanho]) return false;
  }
  return true;
}

const PESOS_CNPJ = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoCnpj(base: string): number {
  const pesos = PESOS_CNPJ.slice(PESOS_CNPJ.length - base.length);
  let soma = 0;
  for (let i = 0; i < base.length; i++) soma += (base.charCodeAt(i) - 48) * pesos[i]!;
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCnpj(valor: string): boolean {
  const cnpj = limparDocumento(valor);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || todosIguais(cnpj)) return false;
  const dv1 = digitoCnpj(cnpj.slice(0, 12));
  const dv2 = digitoCnpj(cnpj.slice(0, 12) + dv1);
  return cnpj.endsWith(`${dv1}${dv2}`);
}

/** PF usa CPF; PJ e condomínio usam CNPJ. */
export function validarDocumentoEmpresa(tipo: "PF" | "PJ" | "condominio", valor: string): boolean {
  return tipo === "PF" ? validarCpf(valor) : validarCnpj(valor);
}

export function formatarDocumento(valor: string): string {
  const d = limparDocumento(valor);
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, "$1.$2.$3/$4-$5");
  return valor;
}
