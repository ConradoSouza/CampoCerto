const ha = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const formatarHa = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${ha.format(v)} ha`);
export const formatarInteiro = (v: number) => inteiro.format(v);
export const formatarData = (iso: string | null | undefined) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";

/** Cores por cultura, iguais às do protótipo. */
export const CORES_CULTURA: Record<string, string> = {
  soja: "#6b9a3c",
  milho: "#e6c35c",
  algodão: "#d9d2c3",
  algodao: "#d9d2c3",
  trigo: "#c9a27a",
  feijão: "#a3482a",
  feijao: "#a3482a",
  sorgo: "#b5651d",
  café: "#5b3a29",
  cafe: "#5b3a29",
};
const RESERVA = ["#2f6b43", "#7fb069", "#8c6bb1", "#3c7ea6", "#c47d3b"];

export function corDaCultura(nome: string | null | undefined): string {
  if (!nome) return "#9aa59c";
  const chave = nome.toLowerCase();
  if (CORES_CULTURA[chave]) return CORES_CULTURA[chave];
  let h = 0;
  for (const c of chave) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return RESERVA[h % RESERVA.length]!;
}
