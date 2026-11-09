# SanarMap

**English** · [Français](README.fr.md)

The open map of the **Gaston Berger University** campus (UGB, Sanar, Saint-Louis, Senegal):
buildings, student villages, footpaths, places and the names people actually use for them.
It is ready to use in your projects, **with no Google Maps**, no API key and no tile server.

It is made by students, for student projects: a course app, a thesis, a hackathon, a student
association website… Anyone can use it and improve it.

**[See the example map](https://sanarmap.github.io/sanarmap/)**: tap a starting point, then a
destination, and the walking route is computed right in the page.

## Using the map

The ready-to-use files are published after every change:

| File | Contents |
|---|---|
| [`campus.geojson`](https://sanarmap.github.io/sanarmap/campus.geojson) | The simplified map: each feature has `k` (family: `building`, `zone`, `green`, `sand`, `water`, `sport`, `path`, `road-minor`, `road-major`, `campus`), `name` if it has one, and `id`. |
| [`places.geojson`](https://sanarmap.github.io/sanarmap/places.geojson) | The places (registrar's office, library, restaurants, faculties, villages…): name, short name, category, description, search keywords, linked buildings, and the rooms, programs and services found there. |
| [`reseau.json`](https://sanarmap.github.io/sanarmap/reseau.json) | Footpaths and streets, for computing walking routes (format below). |

The data is in French, as on campus: place names, descriptions and keywords
(`UFR` = faculty, `BU` = university library, `Resto` = student restaurant, `Village` = a group
of student residences).

With [MapLibre GL](https://maplibre.org/) (open source, free):

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

The full example, with route finding, is in [`examples/index.html`](examples/index.html)
(a single page, no build step). Leaflet, OpenLayers, QGIS and Flutter (`flutter_map`) can
read the GeoJSON too.

### `reseau.json` format

```js
{ "nodes": [lng, lat, lng, lat, …],   // point i is nodes[2i], nodes[2i+1]
  "edges": [a, b, type, a, b, type, …] } // segment between points a and b
```

`type`: 0 footpath, 1 street, 2 main road (the Rosso road), 3 street or path in the
neighbourhood, outside the university boundary. For natural-looking routes, count the main
road as 1.5 times its length (campus paths are preferred) and the neighbourhood as 2.5 times
(walking along the main road beats cutting through the neighbourhood). Two segments are
connected when they share a point.

## Contributing

A building is missing, a name is wrong, a shortcut across the sand isn't drawn? Read
[CONTRIBUTING.md](CONTRIBUTING.md) (in French). You don't need to be a developer: you can also
[open an issue](../../issues/new) with a photo and a description, and someone will take care
of it.

## Data

- `data/campus.geojson`: **the source**. Every feature on campus, tagged with the
  OpenStreetMap vocabulary (`building=*`, `highway=footway`, `name=*`…), one feature per line.
- `data/places.geojson`: the places, one per line.
- `scripts/build.mjs` produces `dist/`; `scripts/validate.mjs` checks the data (run
  automatically on every pull request). Node 20 or later, no dependencies.

```sh
node scripts/validate.mjs
node scripts/build.mjs   # then serve dist/ with a small server: npx serve dist
```

## License and origin

SanarMap started from an [OpenStreetMap](https://www.openstreetmap.org/) snapshot taken on
8 November 2026, and has been improved by its contributors since.

- **Data** (`data/`, `dist/*.geojson`, `dist/reseau.json`): [Open Database License 1.0](data/LICENSE.md).
  You may use it, even in a commercial project, as long as you **credit
  "SanarMap, d'après © contributeurs OpenStreetMap"** and share any database you derive from
  it under the same license.
- **Code** (scripts, example): [MIT](LICENSE).

The project grew out of [SanarView](https://sanarview.app), the campus guide for new students.
