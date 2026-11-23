import { describe, expect, it } from "vitest";
import {
  areaHa,
  calcularSobreposicao,
  conflitosDeSobreposicao,
  paraMultiPolygon,
  validarAreaProdutiva,
} from "../src";
import { retangulo } from "./apoio";

// Perto de Sorriso (MT): 0,01° ≈ 1,07 km de longitude e 1,11 km de latitude.
const A = retangulo(-55.7, -12.55, 0.01, 0.01);

describe("área", () => {
  it("calcula a área geodésica em hectares com duas casas", () => {
    const ha = areaHa(A);
    expect(ha).toBeGreaterThan(115);
    expect(ha).toBeLessThan(122);
    expect(Math.round(ha * 100) / 100).toBe(ha);
  });
  it("trata Polygon e MultiPolygon igual", () => {
    expect(areaHa(paraMultiPolygon(A))).toBe(areaHa(A));
  });
});

describe("sobreposição (CM2)", () => {
  it("é zero para talhões vizinhos", () => {
    const vizinho = retangulo(-55.69, -12.55, 0.01, 0.01);
    expect(calcularSobreposicao(A, vizinho).fracao).toBeCloseTo(0, 3);
  });
  it("mede a fração sobre o menor talhão", () => {
    const metade = retangulo(-55.695, -12.55, 0.01, 0.01);
    expect(calcularSobreposicao(A, metade).fracao).toBeCloseTo(0.5, 2);
  });
  it("bloqueia acima de 0,5% e tolera abaixo", () => {
    const quase = retangulo(-55.69 - 0.00003, -12.55, 0.01, 0.01); // ~0,3%
    const demais = retangulo(-55.69 - 0.0001, -12.55, 0.01, 0.01); // ~1%
    expect(conflitosDeSobreposicao(quase, [{ id: "a", contorno: A }])).toHaveLength(0);
    expect(conflitosDeSobreposicao(demais, [{ id: "a", contorno: A }]).map((c) => c.id)).toEqual(["a"]);
  });
});

describe("área produtiva (CM1)", () => {
  it("não pode passar da área do desenho", () => {
    expect(validarAreaProdutiva(100, 99.5)).toBeNull();
    expect(validarAreaProdutiva(100, null)).toBeNull();
    expect(validarAreaProdutiva(100, 100.01)).toMatch(/passa da área/);
  });
});
