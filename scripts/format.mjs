// Remet les fichiers de data/ en forme : un objet par ligne, triés par identifiant, comme le
// reste du projet (après un passage dans geojson.io ou QGIS, qui réécrivent tout).
// Usage : node scripts/format.mjs
import { readCollection, writeCollection } from "./lib.mjs";

for (const path of ["data/campus.geojson", "data/places.geojson"]) {
  const { type, features, ...meta } = readCollection(path);
  if (type !== "FeatureCollection") throw new Error(`${path} n'est pas une FeatureCollection`);
  // geojson.io et QGIS rangent parfois l'identifiant dans les propriétés.
  for (const f of features) {
    if (f.id === undefined && f.properties?.id !== undefined) {
      f.id = f.properties.id;
      delete f.properties.id;
    }
  }
  writeCollection(path, features, meta);
  console.log(path, features.length, "objets");
}
