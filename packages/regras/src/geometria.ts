import turfArea from "@turf/area";
import { feature, featureCollection } from "@turf/helpers";
import intersect from "@turf/intersect";
import type { MultiPolygon, Polygon } from "geojson";

/** CM2: talhões da mesma fazenda podem se sobrepor no máximo 0,5%. */
export const LIMITE_SOBREPOSICAO = 0.005;

export type Contorno = Polygon | MultiPolygon;

export function arredondarHa(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** CM1: área geodésica do contorno, em hectares, com duas casas. */
export function areaHa(contorno: Contorno): number {
  return arredondarHa(turfArea(contorno) / 10_000);
}

export function paraMultiPolygon(contorno: Contorno): MultiPolygon {
  return contorno.type === "MultiPolygon"
    ? contorno
    : { type: "MultiPolygon", coordinates: [contorno.coordinates] };
}

export interface Sobreposicao {
  areaHa: number;
  /** Fração da área do menor dos dois talhões (0 a 1). */
  fracao: number;
}

export function calcularSobreposicao(a: Contorno, b: Contorno): Sobreposicao {
  const inter = intersect(featureCollection([feature(a), feature(b)]));
  if (!inter) return { areaHa: 0, fracao: 0 };
  const m2 = turfArea(inter);
  const menor = Math.min(turfArea(a), turfArea(b));
  return { areaHa: arredondarHa(m2 / 10_000), fracao: menor > 0 ? m2 / menor : 0 };
}

export interface ConflitoSobreposicao extends Sobreposicao {
  id: string;
}

/**
 * Lista os talhões existentes que se sobrepõem ao novo contorno acima do limite.
 * O banco aplica a mesma regra; aqui serve para avisar antes de salvar.
 */
export function conflitosDeSobreposicao(
  novo: Contorno,
  existentes: { id: string; contorno: Contorno }[],
  limite = LIMITE_SOBREPOSICAO,
): ConflitoSobreposicao[] {
  return existentes
    .map((t) => ({ id: t.id, ...calcularSobreposicao(novo, t.contorno) }))
    .filter((c) => c.fracao > limite);
}

/** CM1: a área produtiva é informada e não pode passar da área do polígono. */
export function validarAreaProdutiva(areaPoligonoHa: number, areaProdutivaHa: number | null): string | null {
  if (areaProdutivaHa === null) return null;
  if (areaProdutivaHa < 0) return "A área produtiva não pode ser negativa.";
  if (areaProdutivaHa > areaPoligonoHa) {
    return `A área produtiva (${areaProdutivaHa} ha) passa da área do desenho (${areaPoligonoHa} ha).`;
  }
  return null;
}
