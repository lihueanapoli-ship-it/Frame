---
description: Automatizar el push a GitHub para actualizar la página
---

Este workflow automatiza el envío de cambios a GitHub.

// turbo-all
1. Agregar todos los cambios:
```powershell
git add .
```

2. Crear un commit con los cambios actuales (puedes editar el mensaje):
```powershell
git commit -m "Auto-update from Antigravity: UI and Data fixes"
```

3. Subir los cambios a GitHub:
```powershell
git push origin main
```
