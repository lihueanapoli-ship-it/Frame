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
