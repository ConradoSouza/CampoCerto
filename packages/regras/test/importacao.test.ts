import type { FeatureCollection, Geometry } from "geojson";
import { describe, expect, it } from "vitest";
import { extrairTalhoes } from "../src";
import { retangulo } from "./apoio";

describe("importação de talhões", () => {
  it("lê código e nome das propriedades, ignora o que não é polígono e evita código repetido", () => {
    const fc: FeatureCollection<Geometry | null> = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { Codigo: "T01", Nome: "Baixada" }, geometry: retangulo(-55.7, -12.55, 0.01, 0.01) },
        { type: "Feature", properties: { name: "T01" }, geometry: retangulo(-55.68, -12.55, 0.01, 0.01) },
        { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [-55.7, -12.55] } },
        { type: "Feature", properties: null, geometry: retangulo(-55.66, -12.55, 0.01, 0.01) },
      ],
    };
    const r = extrairTalhoes(fc);
    expect(r.talhoes.map((t) => [t.codigo, t.nome])).toEqual([
      ["T01", "Baixada"],
      ["T01-2", "T01"],
      ["4", "Talhão 4"],
    ]);
    expect(r.talhoes[0]!.contorno.type).toBe("MultiPolygon");
    expect(r.ignorados).toEqual([{ indice: 2, motivo: "Geometria Point não é um contorno de talhão" }]);
  });
});
