// Fabrique dist/, les fichiers prêts à l'emploi pour les applications :
//   campus.geojson  carte simplifiée (k = famille d'affichage, name, id)
//   places.geojson  les lieux
//   reseau.json     chemins et rues, pour calculer des itinéraires à pied
//   index.html      exemple de carte (MapLibre, sans Google ni fond de tuiles)
// Usage : node scripts/build.mjs
import fs from "node:fs";
import { inRing, inside, kind, lines, outerRings, readCollection } from "./lib.mjs";

const campus = readCollection("data/campus.geojson");
const places = readCollection("data/places.geojson");
const round = (c) => (typeof c[0] === "number" ? [+c[0].toFixed(6), +c[1].toFixed(6)] : c.map(round));

const out = [];
for (const f of campus.features) {
  const p = f.properties;
  const k = kind(p);
  if (!k) continue;
  const t = f.geometry.type;
  const area = t === "Polygon" || t === "MultiPolygon";
  if (["building", "sport", "water", "green", "sand", "campus", "zone"].includes(k) && !area) continue;
  if ((k.startsWith("road") || k === "path") && !lines(f.geometry).length) continue;
  if (area && k !== "campus" && !outerRings(f.geometry)[0].some(inside)) continue;
  out.push({
    type: "Feature",
    properties: { k, ...(p.name ? { name: p.name } : {}), id: f.id },
    geometry: { type: t, coordinates: round(f.geometry.coordinates) },
  });
}

// Un « bâtiment » qui en contient au moins trois autres est une enceinte (village, UFR) mal
// étiquetée : on le traite comme une zone, sinon son volume recouvre les vrais bâtiments.
const box = (r) => r.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
const buildings = out.filter((f) => f.properties.k === "building").map((f) => ({ f, ring: outerRings(f.geometry)[0] }));
for (const b of buildings) {
  const [w, s, e, n] = box(b.ring);
  let inner = 0;
  for (const o of buildings) {
    if (o === b) continue;
    const [x, y] = o.ring[0];
    if (x > w && x < e && y > s && y < n && inRing(o.ring[0], b.ring) && ++inner >= 3) break;
  }
  if (inner >= 3) b.f.properties.k = "zone";
}

// Réseau à pied : les tronçons qui partagent un point (coordonnées identiques) sont reliés.
// nodes = [lng, lat, lng, lat…] ; edges = [a, b, type…] avec type 0 chemin, 1 rue, 2 grande route.
const TYPE = { path: 0, "road-minor": 1, "road-major": 2 };
const index = new Map();
const nodes = [];
const edges = [];
const node = (c) => {
  const key = `${c[0]},${c[1]}`;
  if (!index.has(key)) (index.set(key, nodes.length / 2), nodes.push(c[0], c[1]));
  return index.get(key);
};
for (const f of out) {
  const t = TYPE[f.properties.k];
  if (t === undefined) continue;
  for (const l of lines(f.geometry)) for (let i = 1; i < l.length; i++) edges.push(node(l[i - 1]), node(l[i]), t);
}

fs.mkdirSync("dist", { recursive: true });
const attribution = "SanarMap, d'après © contributeurs OpenStreetMap · ODbL 1.0";
fs.writeFileSync("dist/campus.geojson", JSON.stringify({ type: "FeatureCollection", attribution, features: out }));
fs.writeFileSync("dist/places.geojson", JSON.stringify({ type: "FeatureCollection", attribution, features: places.features }));
fs.writeFileSync("dist/reseau.json", JSON.stringify({ attribution, nodes, edges }));
fs.copyFileSync("examples/index.html", "dist/index.html");

const count = out.reduce((a, f) => ((a[f.properties.k] = (a[f.properties.k] ?? 0) + 1), a), {});
console.log(count);
console.log(`réseau : ${nodes.length / 2} points, ${edges.length / 3} tronçons · ${places.features.length} lieux`);
