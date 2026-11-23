import type { Polygon } from "geojson";

/** Retângulo em graus a partir do canto sudoeste. */
export function retangulo(lon: number, lat: number, dLon: number, dLat: number): Polygon {
  return {
    type: "Polygon",
    coordinates: [[[lon, lat], [lon + dLon, lat], [lon + dLon, lat + dLat], [lon, lat + dLat], [lon, lat]]],
  };
}
