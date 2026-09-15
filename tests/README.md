# Verificación local

Requisitos: dependencias instaladas con `npm ci`, Firebase CLI y Java 21 o superior.

```sh
npm run build
firebase emulators:exec --only firestore --project demo-frame-rules --config firebase.emulators.json "node --test tests/firestore.rules.test.mjs"
```

La suite usa exclusivamente el emulador local en el puerto 8186 y el proyecto
descartable `demo-frame-rules`. Limpia sus datos antes de empezar; no usa las
credenciales de la aplicación ni accede a producción.

Cubre propiedad de perfiles y películas, conservación de datos al inicializar
perfiles, búsquedas, seguidores, colaboración en listas, solicitudes, aceptación
atómica de amistades y denegación de acceso a chat y a la colección de perfiles
retirada.

`firebase.emulators.json` está separado de la configuración de despliegue.

## TMDB

```sh
node --test tests/tmdb.test.mjs
npm run build
```

Estas pruebas usan respuestas simuladas: no necesitan credenciales, acceso a
TMDB ni el emulador de Firebase.

El único cliente HTTP reside en `src/services/tmdb.js`. Obtiene las credenciales
de `VITE_TMDB_API_KEY` o `VITE_TMDB_ACCESS_TOKEN` (también admite
`VITE_TMDB_API_READ_ACCESS_TOKEN`). Nunca registra claves ni objetos de error
Axios completos. Las variables `VITE_*` se incluyen en el cliente; su
centralización no las convierte en secretos del servidor.

El servicio devuelve películas con nueve campos normalizados; los metadatos de
duración, elenco y países tienen un método separado. `src/api/tmdb.js` adapta
los registros guardados y las recomendaciones al formato anterior sin hacer HTTP.

La caché vive en memoria durante la carga actual de la aplicación y se vacía al
recargar la página. Guarda respuestas normalizadas, incluso disponibilidad vacía;
no guarda errores. Las claves incluyen endpoint y parámetros ordenados, con
idioma y página cuando corresponden. La disponibilidad se comparte por película
para Argentina entre todos los idiomas. Las promesas en curso deduplican peticiones
idénticas y una cola limita las conexiones simultáneas a seis. Se devuelven copias
para que una edición de la UI no altere la caché.

Para streaming se usa `watch_region=AR` en catálogo y descubrimiento, y únicamente
`results.AR` en disponibilidad por película. Suscripción (`flatrate`), compra
(`buy`) y alquiler (`rent`) se mantienen separados. Los IDs canónicos son Netflix
8, Max 1899 (admite 384), Disney+ 337, Prime Video 119, Paramount+ 531 y Apple TV+
350. Las tiendas y los canales con suscripción adicional conservan sus propios IDs.
Los logos se obtienen del catálogo de TMDB, sin URLs de logos antiguas hardcodeadas.

Referencias: [disponibilidad y atribución JustWatch](https://developer.themoviedb.org/reference/movie-watch-providers),
[filtros regionales](https://developer.themoviedb.org/reference/discover-movie).
