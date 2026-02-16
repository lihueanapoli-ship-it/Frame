---
description: Verificar ganadores del Oscar y IDs faltantes
---

Este workflow automatiza la ejecución de los scripts de mantenimiento de datos del proyecto FRAME.

1. Ejecutar el script para encontrar IDs faltantes:
```bash
node scripts/findMissing.js
```

2. Ejecutar la verificación de ganadores del Oscar:
```bash
node scripts/verifyOscarWinners.js
```

3. Revisar si se generó el archivo `corrected_ids.txt` y mostrar las primeras 10 líneas.
