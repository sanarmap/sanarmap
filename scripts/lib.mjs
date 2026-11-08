// Outils partagés par les scripts de SanarMap. Aucune dépendance.
import fs from "node:fs";

/** Zone couverte : [ouest, sud, est, nord]. Le campus de Sanar et ses abords. */
export const BBOX = [-16.433, 16.051, -16.414, 16.075];
export const inside = ([x, y]) => x >= BBOX[0] && x <= BBOX[2] && y >= BBOX[1] && y <= BBOX[3];

/** Distance en mètres (assez précise à l'échelle du campus). */
export const meters = (a, b) => Math.hypot((a[0] - b[0]) * 106_900, (a[1] - b[1]) * 111_320);

export function readCollection(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

/**
 * Écrit une FeatureCollection avec un objet par ligne, triés par identifiant : une modification
 * ne touche que ses lignes, ce qui rend les relectures (pull requests) lisibles.
 */
export function writeCollection(path, features, meta = {}) {
  const sorted = [...features].sort((a, b) => String(a.id).localeCompare(String(b.id), "en", { numeric: true }));
  const head = JSON.stringify({ type: "FeatureCollection", ...meta }).slice(0, -1);
  fs.writeFileSync(path, `${head},"features":[\n${sorted.map((f) => JSON.stringify(f)).join(",\n")}\n]}\n`);
}

export const outerRings = (g) =>
  g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((p) => p[0]) : [];
export const lines = (g) =>
  g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];

export function inRing([x, y], ring) {
  let ok = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}

const GREEN = new Set(["grass", "forest", "meadow", "park", "garden", "orchard", "scrub", "wood", "village_green", "recreation_ground", "farmland"]);
const ROAD_MAJOR = new Set(["trunk", "primary", "secondary", "tertiary"]);
const ROAD_MINOR = new Set(["residential", "unclassified", "service", "living_street", "road"]);
const PATH = new Set(["footway", "path", "pedestrian", "track", "steps", "cycleway"]);

/** Famille d'affichage d'un objet, d'après ses étiquettes (vocabulaire d'OSM). */
export function kind(p) {
  if (p.building) return "building";
  if (p.amenity === "university") return "campus";
  if (["pitch", "track", "sports_centre", "stadium"].includes(p.leisure)) return "sport";
  if (p.natural === "water" || p.water || p.leisure === "swimming_pool" || p.landuse === "basin" || p.landuse === "reservoir") return "water";
  // Enceintes : villages de résidence, UFR… (le contour d'un ensemble, pas d'un bâtiment).
  if (p.landuse === "residential" || p.landuse === "education") return "zone";
  if (GREEN.has(p.landuse) || GREEN.has(p.leisure) || GREEN.has(p.natural)) return "green";
  if (p.natural === "sand" || p.natural === "bare_rock") return "sand";
  if (ROAD_MAJOR.has(p.highway)) return "road-major";
  if (ROAD_MINOR.has(p.highway)) return "road-minor";
  if (PATH.has(p.highway)) return "path";
  return null;
}

/** Catégories des lieux. */
export const CATEGORIES = {
  demarches: "Démarches",
  etudier: "Étudier",
  manger: "Manger",
  vivre: "Vivre sur le campus",
  sante: "Santé",
  pratique: "Pratique",
};

/** Icônes de marqueur possibles (`icon`), quand celle de la catégorie ne va pas au lieu. */
export const ICONS = ["piscine", "sport", "repere", "culture", "chapiteau", "argent", "portail"];
