import { kml } from "@tmcw/togeojson";
import type { FeatureCollection, Geometry } from "geojson";

/** Lê GeoJSON, KML ou Shapefile (.zip com .shp, .dbf e .prj) e devolve um FeatureCollection em WGS84. */
export async function lerArquivoGeografico(arquivo: File): Promise<FeatureCollection<Geometry | null>> {
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith(".kml")) {
    const doc = new DOMParser().parseFromString(await arquivo.text(), "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("O arquivo KML não pôde ser lido.");
    return kml(doc) as FeatureCollection<Geometry | null>;
  }
  if (nome.endsWith(".zip")) {
    const { default: shp } = await import("shpjs");
    const r = await shp(await arquivo.arrayBuffer());
    const colecoes = Array.isArray(r) ? r : [r];
    return { type: "FeatureCollection", features: colecoes.flatMap((c) => c.features) } as FeatureCollection<Geometry | null>;
  }
  if (nome.endsWith(".geojson") || nome.endsWith(".json")) {
    const dados = JSON.parse(await arquivo.text());
    if (dados.type === "FeatureCollection") return dados;
    if (dados.type === "Feature") return { type: "FeatureCollection", features: [dados] };
    return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: dados }] };
  }
  throw new Error("Use um arquivo .kml, .geojson ou .zip de Shapefile.");
}
