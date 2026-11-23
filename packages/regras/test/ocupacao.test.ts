import { describe, expect, it } from "vitest";
import { validarOcupacao } from "../src";

describe("ocupação (CM6)", () => {
  const talhao = { area_ha: 120, area_produtiva_ha: 112.5 };
  it("permite faixas até a área produtiva", () => {
    expect(validarOcupacao(talhao, [{ area_ha: 60 }], 52.5)).toEqual({ ok: true, disponivelHa: 0 });
  });
  it("recusa quando a soma passa da área produtiva", () => {
    const r = validarOcupacao(talhao, [{ area_ha: 60 }], 52.51);
    expect(r.ok).toBe(false);
    expect(r.disponivelHa).toBe(52.5);
  });
  it("usa a área do desenho quando não há área produtiva", () => {
    expect(validarOcupacao({ area_ha: 10, area_produtiva_ha: null }, [], 10).ok).toBe(true);
  });
});
