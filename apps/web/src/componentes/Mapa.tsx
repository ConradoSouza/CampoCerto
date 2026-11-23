"use client";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, MultiPolygon, Position } from "geojson";
import { useEffect, useRef, useState } from "react";

export interface TalhaoMapa {
  id: string;
  codigo: string;
  cor: string;
  contorno: MultiPolygon;
}

const ESTILO: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    satelite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Imagens © Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [
    { id: "fundo", type: "background", paint: { "background-color": "#2b3a2e" } },
    { id: "satelite", type: "raster", source: "satelite" },
  ],
};

function colecao(talhoes: TalhaoMapa[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: talhoes.map((t) => ({ type: "Feature", id: t.id, properties: { id: t.id, codigo: t.codigo, cor: t.cor }, geometry: t.contorno })),
  };
}

function limites(talhoes: TalhaoMapa[]): LngLatBoundsLike | null {
  const pts: Position[] = talhoes.flatMap((t) => t.contorno.coordinates.flat(2));
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]!);
  const ys = pts.map((p) => p[1]!);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}

/** Ponto para o rótulo: centro do maior anel externo (bom o bastante para talhões). */
function centro(c: MultiPolygon): [number, number] {
  const anel = [...c.coordinates].sort((a, b) => b[0]!.length - a[0]!.length)[0]![0]!;
  const xs = anel.map((p) => p[0]!);
  const ys = anel.map((p) => p[1]!);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/**
 * Mapa de talhões com imagem de satélite (MapLibre GL).
 * `previa` desenha talhões ainda não salvos (importação) com contorno tracejado.
 */
export function Mapa({
  talhoes,
  previa = [],
  selecionado,
  aoSelecionar,
}: {
  talhoes: TalhaoMapa[];
  previa?: TalhaoMapa[];
  selecionado?: string | null;
  aoSelecionar?: (id: string) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const [carregado, setCarregado] = useState(false);
  const rotulos = useRef<maplibregl.Marker[]>([]);
  const callback = useRef(aoSelecionar);
  callback.current = aoSelecionar;

  useEffect(() => {
    if (!caixa.current) return;
    const m = new maplibregl.Map({ container: caixa.current, style: ESTILO, center: [-55.7, -12.55], zoom: 12, attributionControl: { compact: true } });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    m.on("load", () => {
      m.addSource("talhoes", { type: "geojson", data: colecao([]) });
      m.addSource("previa", { type: "geojson", data: colecao([]) });
      m.addLayer({ id: "talhoes-fill", type: "fill", source: "talhoes", paint: { "fill-color": ["get", "cor"], "fill-opacity": 0.55 } });
      m.addLayer({ id: "talhoes-linha", type: "line", source: "talhoes", paint: { "line-color": "#f4f3ec", "line-width": 1.5 } });
      m.addLayer({
        id: "talhoes-sel", type: "line", source: "talhoes", filter: ["==", ["get", "id"], ""],
        paint: { "line-color": "#e6c35c", "line-width": 4 },
      });
      m.addLayer({ id: "previa-fill", type: "fill", source: "previa", paint: { "fill-color": "#e6c35c", "fill-opacity": 0.3 } });
      m.addLayer({ id: "previa-linha", type: "line", source: "previa", paint: { "line-color": "#e6c35c", "line-width": 2, "line-dasharray": [2, 1] } });
      m.on("click", "talhoes-fill", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (typeof id === "string") callback.current?.(id);
      });
      m.on("mouseenter", "talhoes-fill", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "talhoes-fill", () => (m.getCanvas().style.cursor = ""));
      setCarregado(true);
    });
    mapa.current = m;
    return () => {
      setCarregado(false);
      m.remove();
    };
  }, []);

  // Dados dos talhões e rótulos
  useEffect(() => {
    const m = mapa.current;
    if (!m || !carregado) return;
    (m.getSource("talhoes") as GeoJSONSource).setData(colecao(talhoes));
    (m.getSource("previa") as GeoJSONSource).setData(colecao(previa));
    for (const r of rotulos.current) r.remove();
    rotulos.current = [...talhoes, ...previa].map((t) => {
      const el = document.createElement("span");
      el.textContent = t.codigo;
      el.style.cssText = "font:700 12px var(--fonte-titulo),sans-serif;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000;pointer-events:none";
      return new maplibregl.Marker({ element: el }).setLngLat(centro(t.contorno)).addTo(m);
    });
    const b = limites(previa.length ? previa : talhoes);
    if (b) m.fitBounds(b, { padding: 40, duration: 0 });
  }, [carregado, talhoes, previa]);

  // Destaque do selecionado
  useEffect(() => {
    const m = mapa.current;
    if (!m || !carregado) return;
    m.setFilter("talhoes-sel", ["==", ["get", "id"], selecionado ?? ""]);
  }, [carregado, selecionado]);

  return <div className="mapa" ref={caixa} role="region" aria-label="Mapa dos talhões" />;
}
