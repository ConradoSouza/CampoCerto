import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, MultiPolygon } from "geojson";
import { areaHa, paraMultiPolygon } from "./geometria";

export interface TalhaoImportado {
  codigo: string;
  nome: string;
  contorno: MultiPolygon;
  area_ha: number;
}

export interface ResultadoImportacao {
  talhoes: TalhaoImportado[];
  ignorados: { indice: number; motivo: string }[];
}

const CHAVES_CODIGO = ["codigo", "código", "cod", "talhao", "talhão", "id", "name", "nome"];
const CHAVES_NOME = ["nome", "name", "descricao", "descrição", "description", "talhao", "talhão"];

function lerPropriedade(props: GeoJsonProperties, chaves: string[]): string | null {
  if (!props) return null;
  const porChave = new Map(Object.entries(props).map(([k, v]) => [k.toLowerCase(), v]));
  for (const c of chaves) {
    const v = porChave.get(c);
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

/**
 * Converte um GeoJSON (vindo de arquivo GeoJSON, KML ou Shapefile já convertido)
 * em talhões candidatos. Só polígonos entram; pontos e linhas são ignorados com motivo.
 */
export function extrairTalhoes(colecao: FeatureCollection<Geometry | null>): ResultadoImportacao {
  const talhoes: TalhaoImportado[] = [];
  const ignorados: ResultadoImportacao["ignorados"] = [];
  const usados = new Set<string>();

  colecao.features.forEach((f: Feature<Geometry | null>, indice) => {
    const g = f.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) {
      ignorados.push({ indice, motivo: `Geometria ${g?.type ?? "vazia"} não é um contorno de talhão` });
      return;
    }
    const contorno = paraMultiPolygon(g);
    const area = areaHa(contorno);
    if (area <= 0) {
      ignorados.push({ indice, motivo: "Contorno sem área" });
      return;
    }
    let codigo = (lerPropriedade(f.properties, CHAVES_CODIGO) ?? String(indice + 1)).slice(0, 20);
    if (usados.has(codigo)) {
      let n = 2;
      while (usados.has(`${codigo}-${n}`)) n++;
      codigo = `${codigo}-${n}`;
    }
    usados.add(codigo);
    const nome = lerPropriedade(f.properties, CHAVES_NOME) ?? `Talhão ${codigo}`;
    talhoes.push({ codigo, nome: nome.slice(0, 120), contorno, area_ha: area });
  });

  return { talhoes, ignorados };
}
