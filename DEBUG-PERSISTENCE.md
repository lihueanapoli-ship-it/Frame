# 🔧 DEBUG: Problema de Persistencia - Guía de Resolución

## 🐛 **Problema Reportado**
Las películas no se guardan cuando sales y vuelves a entrar.

## ✅ **Cambios Aplicados**

### **1. Arreglé `updateCloud` para usar `setDoc` con merge**

**Antes:**
```javascript
await updateDoc(userRef, {
  watchlist: newWatchlist,
  watched: newWatched
});
```

**Problema:** `updateDoc` falla si el documento no existe.

**Ahora:**
```javascript
await setDoc(userRef, {
  watchlist: newWatchlist,
  watched: newWatched
}, { merge: true });
```

**Beneficio:** Funciona incluso si el documento no existe todavía.

---

### **2. Agregué Logging Completo**

Ahora en la consola del browser vas a ver:

```
[MovieContext] Setting up Firebase listener for user: abc123
[MovieContext] 📥 Received from Firebase: { watchlist: 5, watched: 10 }
[MovieContext] ✅ Synced to cloud: { watchlist: 6, watched: 10 }
```

Esto te permite debuggear exactamente qué está pasando.

---

## 🧪 **Cómo Testear la Corrección**

### **Paso 1: Abrir Browser Console**
1. Abrir `http://localhost:5173/`
2. Presionar `F12` → **Console** tab
3. Recargar la página (`Ctrl+R`)

### **Paso 2: Verificar Logs de Inicio**

Deberías ver algo como:
```
[MovieContext] Setting up Firebase listener for user: gJa8K3fO...
[MovieContext] 📥 Received from Firebase: { watchlist: 0, watched: 0 }
```

O si el documento no existe:
```
[MovieContext] Document does not exist, creating with local data
[MovieContext] Creating initial doc with: { watchlist: 0, watched: 0 }
```

### **Paso 3: Agregar una Película**

1. Buscá una película
2. Click en "Agregar a Watchlist"
3. **En Console deberías ver:**
   ```
   [MovieContext] ✅ Synced to cloud: { watchlist: 1, watched: 0 }
   ```

### **Paso 4: Verificar en Firebase**

1. Abrir **Firebase Console** → Firestore Database
2. Navegar a `users/{tu_userId}`
3. Deberías ver:
   ```json
   {
     "watchlist": [
       {
         "id": 123,
         "title": "Relatos Salvajes",
         "addedAt": "2026-02-01T..."
       }
     ],
     "watched": []
   }
   ```

### **Paso 5: Recargar y Verificar Persistencia**

1. **Recargar la página** (`Ctrl+R` o `F5`)
2. En Console deberías ver:
   ```
   [MovieContext] 📥 Received from Firebase: { watchlist: 1, watched: 0 }
   ```
3. **La película debería seguir en tu watchlist**

---

## ❌ **Si Todavía No Funciona**

### **Escenario A: Console muestra "No user or db"**

**Significa:** Firebase no está configurado o no estás logueado

**Solución:**
1. Verificar que tenés `.env` con las keys de Firebase
2. Login con Google
3. Verificar en Console que aparece el user ID

---

### **Escenario B: Console muestra Error de Permisos**

**Ejemplo:**
```
❌ Firebase listener error: Missing or insufficient permissions
```

**Significa:** Firestore rules no permiten escribir

**Solución:**
Ir a Firebase Console → Firestore → **Rules** y asegurarse que sea:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /userProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click **Publish** y reintentar.

---

### **Escenario C: Console muestra Sync exitoso pero al recargar no aparece**

**Ejemplo:**
```
✅ Synced to cloud: { watchlist: 1, watched: 0 }
// Recargar página
📥 Received from Firebase: { watchlist: 0, watched: 0 }  ⚠️ Volvió a 0!
```

**Significa:** Hay un race condition o el documento se está sobrescribiendo

**Debuggear:**
1. En Firebase Console, verificar manualmente el documento `users/{userId}`
2. Si el documento tiene data pero el listener recibe vacío, puede ser un problema de cache
3. Probá hacer **hard refresh**: `Ctrl+Shift+R`

---

### **Escenario D: Modo Local (sin Firebase)**

Si no tenés Firebase configurado:

**Console debería mostrar:**
```
[MovieContext] No user or db, clearing cloud state
```

**En este caso:**
- Las películas se guardan en **localStorage**
- Clave: `cinetrack_watchlist` y `cinetrack_watched`
- Persistencia funciona entre recargas
- **Debugging:**
  1. Abrir DevTools → Application → Local Storage
  2. Verificar que las keys existan
  3. Deberían tener arrays de películas

---

## 🔍 **Manual Debug Steps**

### **1. Verificar State en React DevTools**

1. Instalar React DevTools (extensión de Chrome)
2. Abrir DevTools → **Components** tab
3. Buscar `MovieProvider`
4. Verificar state:
   - `cloudWatchlist`: []
   - `cloudWatched`: []
   - `localWatchlist`: []
   - `isCloud`: true/false

### **2. Verificar que useLocalStorage funciona**

En Console:
```javascript
localStorage.getItem('cinetrack_watchlist')
```

Debería retornar un array JSON si hay películas guardadas.

### **3. Forzar guardado manual**

```javascript
// En Console del browser
const movie = { 
  id: 999, 
  title: "Test Movie", 
  addedAt: new Date().toISOString() 
};

// Esto debería agregar la película
// (si tenés acceso al context)
```

---

## 🎯 **Checklist Completo**

Verificá estos puntos en orden:

- [ ] ¿Ves logs `[MovieContext]` en Console?
- [ ] ¿El log dice "Setting up Firebase listener" con tu user ID?
- [ ] ¿Cuando agregás película aparece "✅ Synced to cloud"?
- [ ] ¿En Firebase Console aparece el documento `users/{userId}`?
- [ ] ¿El documento tiene el array `watchlist` con películas?
- [ ] ¿Al recargar, el log dice "📥 Received from Firebase: { watchlist: X }"?
- [ ] ¿La película aparece en la UI después de recargar?

---

## 📋 **Qué Reportar si Sigue Fallando**

Si después de estos pasos sigue sin funcionar, copia y pega:

1. **Todos los logs de Console** que empiecen con `[MovieContext]`
2. **Screenshot de Firebase Console** mostrando el documento `users/{userId}`
3. **Screenshot de DevTools → Application → Local Storage** (cinetrack keys)
4. **¿Qué paso específico falla?** (ej: "Se guarda, pero al recargar desaparece")

---

## ✅ **Espero que esto lo arregle**

El cambio principal fue:
- `updateDoc` → `setDoc` con `merge: true`
- Agregué logs extensivos para debugging

**Probalo y avisame qué ves en Console!** 🚀
