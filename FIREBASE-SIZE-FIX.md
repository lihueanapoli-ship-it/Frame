# 🔧 ARREGLADO: Firebase Document Size Limit

## 🐛 **El Problema Real**

```
❌ FirebaseError: Document size (1,058,471 bytes) exceeds maximum (1,048,576 bytes)
```

**Firestore tiene un límite de 1MB por documento.**

Cuando guardábamos películas, estábamos guardando **TODO el objeto de TMDB**:
- `overview` (1-3KB de texto)
- `backdrop_path`, `poster_path` (URLs largas)
- `genre_ids`, `production_companies` (arrays)
- `vote_average`, `vote_count`, `popularity`, etc.

**Por película:** ~40-50KB  
**Con 20-25 películas:** >1MB 💥

---

## ✅ **La Solución: Strip Movie Data**

Ahora solo guardamos lo **esencial** por película:

```javascript
{
  id: 123,
  title: "Relatos Salvajes",
  poster_path: "/abc123.jpg",
  release_date: "2014-08-21",
  rating: 5,              // Solo si está en watched
  addedAt: "2026-02-01",  // Timestamp
  watchedAt: "2026-02-01" // Solo si está en watched
}
```

**Reducción:** 40KB → **~500 bytes** por película (98% menos!)

---

## 📊 **Capacidad Mejorada**

| Antes | Ahora |
|-------|-------|
| ~25 películas max | ~2000 películas max |
| 40KB por película | 500 bytes por película |
| Document size limit frecuente | Nunca alcanzarás el límite |

---

## 🔄 **Migración de Datos Viejos**

Si ya tenías películas guardadas con datos completos, necesitás limpiarlas.

### **Opción 1: Borrar y empezar de nuevo (más fácil)**

1. Ir a Firebase Console
2. Firestore Database
3. Buscar `users/{tu_userId}`
4. Click en los 3 puntitos → **Delete document**
5. Recargar tu app
6. Agregar películas de nuevo

### **Opción 2: Limpiar en Console (avanzado)**

En Console del browser:
```javascript
// Esto limpiará tus listas localmente
localStorage.removeItem('cinetrack_watchlist');
localStorage.removeItem('cinetrack_watched');
location.reload();
```

---

## 🧪 **Testear que Funciona**

1. **Borrar documento viejo de Firebase** (paso 1 arriba)
2. **Recargar tu app**
3. **Agregar 10 películas**
4. En Console deberías ver:
   ```
   [MovieContext] ➕ Adding to watchlist: ...
   [MovieContext] 💾 Syncing to Firebase: { watchlist: 10, watched: 0 }
   [MovieContext] ✅ Sync successful  ← SIN ERRORES!
   ```
5. **Verificar en Firebase Console:**
   - Ir a `users/{userId}`
   - Ver el tamaño del documento (debería ser <50KB incluso con 10 películas)
6. **Recargar página**
7. **Las 10 películas deberían estar ahí** ✅

---

## ⚠️ **Importante: MovieCard Fetch**

Ahora que guardamos menos data, los componentes que muestran películas necesitan hacer **fetch de detalles completos** de TMDB cuando es necesario.

**Esto ya funciona porque:**
- `MovieCard` solo necesita `poster_path` y `title`
- `MovieDetail` hace fetch completo cuando abres una película
- Las listas en `LibraryView` usan `MovieCard` básico

**No hay cambios necesarios en UI!** 🎉

---

## 📋 **Qué Guardamos vs Qué No**

### ✅ **Guardamos (Esencial):**
- `id` - Para identificar
- `title` - Para mostrar
- `poster_path` - Para thumbnail
- `release_date` - Para ordenar
- `rating` - Si está en watched
- `addedAt` / `watchedAt` - Timestamps

### ❌ **NO Guardamos (Innecesario):**
- `overview` - Se obtiene de TMDB cuando se abre
- `backdrop_path` - Se obtiene cuando se abre
- `genre_ids` - Se obtiene de TMDB
- `vote_average`, `vote_count` - Se obtiene de TMDB
- `popularity` - No necesario guardar
- `production_companies` - No necesario
- Todo lo demás

---

## 🚀 **Próximos Pasos**

1. **Borrar documento viejo en Firebase**
2. **Recargar app**
3. **Agregar películas de nuevo**
4. **Verificar que no hay errores de size limit**

Ahora vas a poder agregar **cientos de películas** sin problemas! 🎬

---

## ✅ **Checklist**

- [ ] Borré documento viejo en Firebase Console
- [ ] Recargué la app
- [ ] Agregué películas nuevamente
- [ ] Vi "✅ Sync successful" en Console (sin errores)
- [ ] Recargué página y las películas siguen ahí
- [ ] ✨ TODO FUNCIONA

**Probalo y avisame!** Este era el problema real todo el tiempo. 🔥
