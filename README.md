# SanarMap

La carte libre du campus de l'**Université Gaston Berger** (Sanar, Saint-Louis, Sénégal) :
bâtiments, villages, chemins, lieux et leurs noms d'usage, prête à l'emploi pour vos projets,
**sans Google Maps**, sans clé d'API et sans serveur de tuiles.

Elle est faite par des étudiants, pour les projets des étudiants : une app de cours, un
mémoire, un hackathon, un site d'amicale… Tout le monde peut l'utiliser et l'améliorer.

**[Voir la carte d'exemple](https://sanarmap.github.io/sanarmap/)**: touchez un départ puis
une arrivée, l'itinéraire à pied se calcule dans la page.

## Utiliser la carte

Les fichiers prêts à l'emploi sont publiés à chaque modification :

| Fichier | Contenu |
|---|---|
| [`campus.geojson`](https://sanarmap.github.io/sanarmap/campus.geojson) | La carte simplifiée : chaque objet a `k` (famille : `building`, `zone`, `green`, `sand`, `water`, `sport`, `path`, `road-minor`, `road-major`, `campus`), `name` s'il en a un, et `id`. |
| [`places.geojson`](https://sanarmap.github.io/sanarmap/places.geojson) | Les lieux (scolarité, BU, restos, UFR, villages…) : nom, nom court, catégorie, présentation, mots-clés de recherche, bâtiments liés. |
| [`reseau.json`](https://sanarmap.github.io/sanarmap/reseau.json) | Les chemins et les rues pour calculer des itinéraires à pied (format ci-dessous). |

Avec [MapLibre GL](https://maplibre.org/) (libre, gratuit) :

```js
const map = new maplibregl.Map({
  container: "map",
  center: [-16.4225, 16.0625],
  zoom: 15.6,
  style: { version: 8, sources: {}, layers: [{ id: "fond", type: "background", paint: { "background-color": "#f3f6f7" } }] },
});
map.on("load", () => {
  map.addSource("campus", { type: "geojson", data: "https://sanarmap.github.io/sanarmap/campus.geojson" });
  map.addLayer({ id: "batiments", type: "fill", source: "campus", filter: ["==", ["get", "k"], "building"], paint: { "fill-color": "#dfd8cf" } });
});
```

L'exemple complet, avec le calcul d'itinéraire, est dans [`examples/index.html`](examples/index.html)
(une seule page, sans outil de build). Leaflet, OpenLayers, QGIS ou Flutter
(`flutter_map`) lisent aussi le GeoJSON.

### Format de `reseau.json`

```js
{ "nodes": [lng, lat, lng, lat, …],   // le point i est nodes[2i], nodes[2i+1]
  "edges": [a, b, type, a, b, type, …] } // tronçon entre les points a et b
```

`type` : 0 chemin, 1 rue, 2 grande route (route de Rosso ; comptez-la 1,5 fois plus longue pour
éviter de la longer). Deux tronçons sont reliés quand ils partagent un point.

## Contribuer

Un bâtiment manque, un nom est faux, un raccourci dans le sable n'est pas tracé ? Lisez
[CONTRIBUTING.md](CONTRIBUTING.md). Pas besoin d'être développeur : on peut aussi
[ouvrir une issue](../../issues/new) avec une photo et une description, et quelqu'un s'en occupe.

## Données

- `data/campus.geojson` : **la source**. Tous les objets du campus, avec leurs étiquettes dans le
  vocabulaire d'OpenStreetMap (`building=*`, `highway=footway`, `name=*`…), un objet par ligne.
- `data/places.geojson` : les lieux, un par ligne.
- `scripts/build.mjs` fabrique `dist/` ; `scripts/validate.mjs` vérifie les données (lancé
  automatiquement sur chaque pull request). Node 20 ou plus, aucune dépendance.

```sh
node scripts/validate.mjs
node scripts/build.mjs   # puis ouvrez dist/ avec un petit serveur : npx serve dist
```

## Licence et origine

SanarMap part d'un instantané d'[OpenStreetMap](https://www.openstreetmap.org/) du
8 novembre 2026, complété depuis par ses contributeurs.

- **Données** (`data/`, `dist/*.geojson`, `dist/reseau.json`) : [Open Database License 1.0](data/LICENSE.md).
  Vous pouvez les utiliser, même dans un projet commercial, à condition de **citer
  « SanarMap, d'après © contributeurs OpenStreetMap »** et de partager sous la même licence
  une base de données que vous en tirez.
- **Code** (scripts, exemple) : [MIT](LICENSE).

Projet né de [SanarView](https://sanarview.app), le guide du campus pour les nouveaux étudiants.
