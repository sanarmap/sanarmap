// Vérifie les données avant de les accepter (lancé sur chaque pull request).
// Usage : node scripts/validate.mjs        Sortie 1 s'il y a une erreur.
import { BBOX, CATEGORIES, ICONS, inside, kind, lines, meters, outerRings, readCollection } from "./lib.mjs";

const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`${id} : ${msg}`);
const warn = (id, msg) => warnings.push(`${id} : ${msg}`);

const ID = /^((node|way|relation)\/\d+|sm\/[a-z0-9-]+)$/;
const isPos = (c) => Array.isArray(c) && c.length === 2 && c.every((n) => typeof n === "number" && Number.isFinite(n));
const near = ([x, y], m = 0.01) => x >= BBOX[0] - m && x <= BBOX[2] + m && y >= BBOX[1] - m && y <= BBOX[3] + m;

function checkGeometry(id, g) {
  if (!g || typeof g !== "object") return err(id, "géométrie manquante");
  const all = JSON.stringify(g.coordinates ?? null);
  if (!["Point", "LineString", "MultiLineString", "Polygon", "MultiPolygon"].includes(g.type)) return err(id, `type de géométrie inconnu : ${g.type}`);
  const flat = [];
  const walk = (c) => (isPos(c) ? flat.push(c) : Array.isArray(c) ? c.forEach(walk) : err(id, `coordonnées illisibles : ${all.slice(0, 60)}`));
  walk(g.coordinates);
  if (!flat.length) return err(id, "aucune coordonnée");
  if (flat.some((c) => Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90)) return err(id, "coordonnées impossibles (longitude et latitude inversées ?)");
  if (!flat.some((c) => near(c))) err(id, "hors de la zone du campus");
  if (g.type === "LineString" && g.coordinates.length < 2) err(id, "une ligne a besoin d'au moins 2 points");
  for (const ring of g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : []) {
    if (ring.length < 4) err(id, "un contour a besoin d'au moins 4 points (le dernier répète le premier)");
    else if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) err(id, "contour non fermé : le dernier point doit répéter le premier");
  }
}

// --- campus.geojson ---------------------------------------------------------------------------
const campus = readCollection("data/campus.geojson");
const ids = new Set();
for (const f of campus.features ?? []) {
  const id = f.id ?? "(sans id)";
  if (f.type !== "Feature") err(id, "ce n'est pas un objet GeoJSON « Feature »");
  if (!ID.test(String(f.id))) err(id, "identifiant invalide : « sm/mon-objet » pour un nouvel objet (minuscules, chiffres, tirets)");
  if (ids.has(f.id)) err(id, "identifiant en double");
  ids.add(f.id);
  const p = f.properties ?? {};
  if (!Object.keys(p).length) err(id, "aucune étiquette (building, highway, name…)");
  for (const [k, v] of Object.entries(p)) if (typeof v !== "string") err(id, `l'étiquette « ${k} » doit être du texte`);
  checkGeometry(id, f.geometry);
  const k = kind(p);
  const t = f.geometry?.type;
  if (["building", "zone", "green", "sand", "water", "sport"].includes(k) && t !== "Polygon" && t !== "MultiPolygon" && t !== "Point")
    warn(id, `« ${k} » dessiné comme ligne : il faut un contour fermé (Polygon) pour qu'il s'affiche`);
  if (p.name && p.name !== p.name.trim()) err(id, "nom avec des espaces au début ou à la fin");
}

// Chemins presque reliés : un bout à moins de 3 m d'un autre chemin sans le toucher. Le calcul
// d'itinéraire ne relie que les points identiques. Un passage souterrain ou un pont (`layer`)
// croise les autres sans les toucher : on ne signale pas un bout qui tombe au milieu de lui.
const walkable = campus.features.filter((f) => ["path", "road-minor", "road-major"].includes(kind(f.properties ?? {})) && f.geometry);
const vertex = new Map();
for (const f of walkable) for (const l of lines(f.geometry)) for (const c of l) vertex.set(`${c[0]},${c[1]}`, (vertex.get(`${c[0]},${c[1]}`) ?? 0) + 1);
/** Distance en mètres d'un point au segment [a, b]. */
const toSegment = (p, a, b) => {
  const P = [(p[0] - a[0]) * 106_900, (p[1] - a[1]) * 111_320];
  const B = [(b[0] - a[0]) * 106_900, (b[1] - a[1]) * 111_320];
  const len = B[0] ** 2 + B[1] ** 2;
  const t = len ? Math.max(0, Math.min(1, (P[0] * B[0] + P[1] * B[1]) / len)) : 0;
  return Math.hypot(P[0] - t * B[0], P[1] - t * B[1]);
};
const layer = (f) => f.properties.layer ?? "0";
for (const f of walkable)
  for (const l of lines(f.geometry))
    for (const end of [l[0], l.at(-1)]) {
      if (!end || (vertex.get(`${end[0]},${end[1]}`) ?? 0) > 1 || !inside(end)) continue;
      let best = Infinity;
      for (const o of walkable) {
        if (o === f) continue;
        for (const m of lines(o.geometry)) {
          for (let i = 1; i < m.length; i++) {
            const d = toSegment(end, m[i - 1], m[i]);
            // Niveaux différents : seul un bout de l'autre chemin compte (sortie du souterrain).
            if (layer(o) !== layer(f) && Math.min(meters(end, m[0]), meters(end, m.at(-1))) > d + 0.5) continue;
            best = Math.min(best, d);
          }
        }
      }
      if (best > 0 && best < 3) warn(f.id, `un bout du chemin est à ${best.toFixed(1)} m d'un autre sans le toucher : collez-les (accrochage)`);
    }

// --- places.geojson ---------------------------------------------------------------------------
const places = readCollection("data/places.geojson");
const placeIds = new Set();
for (const f of places.features ?? []) {
  const id = f.id ?? "(sans id)";
  if (!/^[a-z0-9-]+$/.test(String(f.id))) err(id, "identifiant de lieu invalide (minuscules, chiffres, tirets)");
  if (placeIds.has(f.id)) err(id, "lieu en double");
  placeIds.add(f.id);
  const p = f.properties ?? {};
  if (!p.name) err(id, "nom manquant");
  if (!CATEGORIES[p.category]) err(id, `catégorie inconnue « ${p.category} » (${Object.keys(CATEGORIES).join(", ")})`);
  if (!p.summary) err(id, "phrase de présentation (summary) manquante");
  if (f.geometry?.type !== "Point") err(id, "un lieu est un point (Point)");
  else checkGeometry(id, f.geometry);
  for (const o of p.objects ?? []) if (!ids.has(o)) err(id, `l'objet « ${o} » n'existe pas dans campus.geojson`);
  if (p.keywords && !Array.isArray(p.keywords)) err(id, "keywords doit être une liste");
  if (p.icon && !ICONS.includes(p.icon)) err(id, `icône inconnue « ${p.icon} » (${ICONS.join(", ")})`);
  if (p.salles && !(Array.isArray(p.salles) && p.salles.every((x) => typeof x === "string" && x.trim()))) err(id, "salles : une liste de noms, comme [\"Salle multimédia\"]");
  if (p.batiments && !(Array.isArray(p.batiments) && p.batiments.every((b) => /^[A-Z]$/.test(b)))) err(id, "batiments : une liste de lettres majuscules, comme [\"C\", \"D\"]");
}

for (const w of warnings) console.log("⚠️ ", w);
for (const e of errors) console.log("❌", e);
console.log(`${campus.features.length} objets, ${places.features.length} lieux · ${errors.length} erreur(s), ${warnings.length} avertissement(s)`);
process.exit(errors.length ? 1 : 0);
