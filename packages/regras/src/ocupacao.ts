import { arredondarHa } from "./geometria";

export interface TalhaoArea {
  area_ha: number;
  area_produtiva_ha: number | null;
}

/** Área que pode ser ocupada numa safra: a produtiva, ou a do desenho se a produtiva não foi informada. */
export function areaOcupavel(t: TalhaoArea): number {
  return t.area_produtiva_ha ?? t.area_ha;
}

/**
 * CM6: a soma das ocupações de um talhão numa safra não passa da área produtiva.
 * `outras` são as demais ocupações do mesmo talhão e safra (sem a que está sendo editada).
 */
export function validarOcupacao(
  talhao: TalhaoArea,
  outras: { area_ha: number }[],
  novaAreaHa: number,
): { ok: true; disponivelHa: number } | { ok: false; disponivelHa: number; mensagem: string } {
  const usada = outras.reduce((s, o) => s + o.area_ha, 0);
  const disponivel = arredondarHa(areaOcupavel(talhao) - usada);
  if (novaAreaHa <= 0) return { ok: false, disponivelHa: disponivel, mensagem: "Informe uma área maior que zero." };
  if (arredondarHa(novaAreaHa) > disponivel) {
    return {
      ok: false,
      disponivelHa: disponivel,
      mensagem: `A ocupação passa da área produtiva do talhão. Disponível: ${disponivel} ha.`,
    };
  }
  return { ok: true, disponivelHa: arredondarHa(disponivel - novaAreaHa) };
}
