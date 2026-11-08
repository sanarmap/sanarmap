// Import initial (une seule fois) : l'instantané d'OpenStreetMap qui sert de point de départ
// à SanarMap. Après l'import, data/campus.geojson est la source : on ne réimporte plus d'OSM.
//
// Usage : node scripts/import-osm.mjs <export-overpass.json>   (demande `npm i osmtogeojson`)
// Données © contributeurs OpenStreetMap, licence ODbL 1.0.
import fs from "node:fs";
import { BBOX, inside, writeCollection } from "./lib.mjs";

const { default: osmtogeojson } = await import("osmtogeojson");
const src = process.argv[2];
if (!src) throw new Error("Chemin de l'export Overpass manquant");
const raw = JSON.parse(fs.readFileSync(src, "utf8"));
const gj = osmtogeojson(raw);

// Données personnelles et internes d'OSM : pas reprises.
const DROP = new Set(["id", "timestamp", "version", "changeset", "user", "uid", "type", "source"]);
const round = (c) => (typeof c[0] === "number" ? [+c[0].toFixed(7), +c[1].toFixed(7)] : c.map(round));

// Les routes sortent de la zone (jusqu'à Dakar) : on ne garde que les morceaux dedans.
function clipLine(coords) {
  const runs = [];
  let run = [];
  coords.forEach((c, i) => {
    const keep = inside(c) || (coords[i - 1] && inside(coords[i - 1])) || (coords[i + 1] && inside(coords[i + 1]));
    if (keep) run.push(c);
    else if (run.length) (runs.push(run), (run = []));
  });
  if (run.length) runs.push(run);
  return runs.filter((r) => r.length > 1);
}

const out = [];
for (const f of gj.features) {
  const tags = Object.fromEntries(Object.entries(f.properties ?? {}).filter(([k]) => !DROP.has(k) && !k.startsWith("@")));
  if (!Object.keys(tags).length || (tags.boundary && !tags.amenity) || tags.route) continue;
  let g = f.geometry;
  if (g.type === "Point") {
    if (!inside(g.coordinates)) continue;
  } else if (g.type === "LineString") {
    const runs = clipLine(g.coordinates);
    if (!runs.length) continue;
    g = runs.length === 1 ? { type: "LineString", coordinates: runs[0] } : { type: "MultiLineString", coordinates: runs };
  } else if (g.type === "Polygon" || g.type === "MultiPolygon") {
    const ring = g.type === "Polygon" ? g.coordinates[0] : g.coordinates[0][0];
    if (!ring.some(inside) && !tags.amenity) continue;
  } else continue;
  out.push({ type: "Feature", id: f.id, properties: tags, geometry: { type: g.type, coordinates: round(g.coordinates) } });
}

writeCollection("data/campus.geojson", out, {
  name: "SanarMap · campus de l'Université Gaston Berger",
  bbox: BBOX,
  source: `Instantané d'OpenStreetMap du ${raw.osm3s?.timestamp_osm_base ?? "?"} (© contributeurs OpenStreetMap, ODbL)`,
});
console.log(out.length, "objets importés");
