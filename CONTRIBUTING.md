# Contribuer à SanarMap

Merci ! Chaque correction aide tous les projets qui utilisent la carte.

## La règle d'or

**Ce qu'on ajoute, on l'a vu sur place**, ou on le tient de quelqu'un qui connaît le
terrain. On ne décalque jamais Google Maps, Google Earth ni aucune image dont la licence ne le
permet pas : ce serait illégal et ça mettrait tout le projet en danger.

## Sans être développeur

[Ouvrez une issue](../../issues/new) : dites ce qui manque ou ce qui est faux, où (un repère
proche suffit), et joignez une photo si vous pouvez. Quelqu'un de l'équipe fera la modification.

## Modifier les données

### 1. Ouvrir le fichier

Les deux fichiers de `data/` sont du GeoJSON, avec **un objet par ligne** :

- `campus.geojson` : bâtiments, enceintes, verdure, chemins… ;
- `places.geojson` : les lieux (un point chacun).

Pour dessiner, le plus simple :

- **[geojson.io](https://geojson.io)** : ouvrez le fichier (*Open › File*), modifiez, puis
  enregistrez (*Save › GeoJSON*). Attention : geojson.io réécrit tout le fichier ; repassez
  `node scripts/format.mjs` avant d'envoyer, pour retrouver un objet par ligne.
- **[QGIS](https://qgis.org)** (gratuit) pour les gros travaux : activez l'accrochage
  (*Snapping*) pour que vos chemins se collent aux autres.

Pour un nom ou une étiquette, un éditeur de texte suffit.

### 2. Les conventions

- **Étiquettes** : le vocabulaire d'OpenStreetMap ([wiki](https://wiki.openstreetmap.org/wiki/FR:Map_Features)) :
  `building=university`, `highway=footway` (chemin), `highway=path` (sentier, sable),
  `landuse=residential` (enceinte d'un village), `leisure=pitch` (terrain), `name=…`.
- **Identifiant** d'un nouvel objet : `"id": "sm/<nom-en-minuscules>"`, par exemple
  `"sm/raccourci-village-d-bu"`. Les objets venus d'OSM gardent le leur (`way/123…`) : ne le
  changez pas, d'autres projets s'y réfèrent.
- **Un chemin doit toucher les autres** : son premier et son dernier point doivent être
  *exactement* des points d'un autre chemin, sinon le calcul d'itinéraire ne pourra pas
  l'emprunter. La validation signale un bout à moins de 3 m d'un autre sans le toucher.
- **Un bâtiment, une enceinte, un terrain** : un contour fermé (`Polygon`), dont le dernier
  point répète le premier.
- **Un lieu** (`places.geojson`) : un `Point` avec `name`, `category` (`demarches`, `etudier`,
  `manger`, `sante`, `vivre`, `pratique`), `summary` (une phrase vraie, sans horaires ni tarifs
  inventés), `objects` (les identifiants des objets de `campus.geojson` qui le dessinent),
  et au besoin `short`, `keywords` (mots que les étudiants tapent vraiment), `batiments`.

### 3. Vérifier et envoyer

```sh
node scripts/format.mjs     # un objet par ligne, triés
node scripts/validate.mjs   # doit finir par « 0 erreur(s) »
node scripts/build.mjs      # facultatif : regardez le résultat dans dist/
```

Puis ouvrez une **pull request** en expliquant ce que vous avez changé et comment vous le savez
(« je passe par là tous les jours », photo…). La validation se relance toute seule ; une
personne de l'équipe relit, puis fusionne. La carte publiée se met à jour quelques minutes après.
