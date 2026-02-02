# 🎬 FRAME - Actualización: DiscoverView Híbrido

## ✅ Cambios Realizados

### **DiscoverView - Versión Híbrida**

Se restauraron **todos los carruseles originales** y se agregó **una sección nueva** "Según tus gustos" que es adaptativa.

---

## 📋 **Estructura Actual**

### **Secciones del DiscoverView (en orden):**

1. **Hero Carousel** (siempre presente)
   - Muestra trending de la semana
   - 5 películas principales

2. **🎯 Según tus gustos** ← **NUEVO** (solo aparece si el usuario tiene películas vistas)
   - Subtítulo: "Recomendaciones personalizadas basadas en tu biblioteca"
   - Usa el sistema de recomendaciones (`getPersonalizedRecommendations`)
   - Combina: géneros favoritos + similares + deep cuts (según expertise level)
   - **Solo se muestra si `watched.length > 0`**

3. **Popular esta semana**
   - Trending actual
   - Subtítulo: "Lo más visto en los últimos días"

4. **Mejor Rankeadas**
   - Top rated de todos los tiempos
   - Subtítulo: "Las películas con mejor puntuación de la historia"

5. **Los Infaltables**
   - Clásicos imprescindibles
   - Link "Ver todo" → `/category/must_watch`

6. **Cortitas y al Pie**
   - Películas < 90 minutos
   - Link "Ver todo" → `/category/short`

7. **Mate y Sobremesa**
   - Dramas conversacionales
   - Link "Ver todo" → `/category/conversation`

8. **El Laboratorio**
   - Sci-Fi
   - Link "Ver todo" → `/category/tech`

9. **El Aguante**
   - Cine argentino
   - Link "Ver todo" → `/category/argentina`

10. **Pulso a Mil**
    - Thriller/Misterio
    - Link "Ver todo" → `/category/thriller`

11. **Primera Cita**
    - Romance/Comedia
    - Link "Ver todo" → `/category/romance`

12. **Misiones de Verdad**
    - Basado en hechos reales
    - Link "Ver todo" → `/category/real_life`

13. **Viaje de Ida**
    - Sagas y trilogías
    - Link "Ver todo" → `/category/sagas`

14. **Solo para Locos**
    - Cine de autor/experimental
    - Link "Ver todo" → `/category/classic_author`

---

## 🎯 **Lógica de "Según tus gustos"**

### **Cuándo aparece:**
```javascript
if (watched.length > 0) {
  // Fetch recomendaciones personalizadas
  // Mostrar sección
}
```

### **Qué muestra:**
Depende del `expertiseLevel`:

- **Novice:** Películas del género favorito (popularidad alta)
- **Intermediate:** Mix de géneros + similares a favoritas
- **Expert:** Deep cuts + películas raras de alta calidad

### **Cómo se calcula:**
1. Se analiza la biblioteca del usuario (`watched`)
2. Se extraen géneros favoritos
3. Se buscan películas similares a las rankeadas 4-5 estrellas
4. Se filtran las que ya vio o están en watchlist
5. Se combinan según expertise level

---

## 🎨 **Diseño de los Carruseles**

### **Scroll Horizontal:**
```jsx
<div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
  {movies.slice(0, 10).map((movie) => (
    <div className="flex-shrink-0 w-[200px] snap-start">
      <MovieCard movie={movie} onClick={...} />
    </div>
  ))}
</div>
```

**Features:**
- ✅ Scroll horizontal suave
- ✅ Scrollbar oculta (`scrollbar-hide`)
- ✅ Snap points para mejor UX
- ✅ 10 películas máximo por carrusel
- ✅ Ancho fijo de 200px por card

---

## 📊 **Flujo de Usuario**

### **Usuario Nuevo (sin películas vistas):**
1. Login
2. Ve **WelcomeView** y completa **OnboardingModal**
3. Agrega 5 películas a watchlist
4. DiscoverView carga
5. **"Según tus gustos" NO aparece** (watchlist no cuenta, solo watched)
6. Ve todas las colecciones estándar

### **Usuario con películas vistas:**
1. Login
2. DiscoverView carga
3. Se hace fetch de recomendaciones en background
4. **"Según tus gustos" aparece en la parte superior**
5. El resto de colecciones se muestran debajo

---

## 🧪 **Cómo Testear**

### **1. Testear sin recomendaciones (usuario nuevo):**
- Login
- No agregues películas a "Watched"
- DiscoverView debería mostrar **solo las colecciones estándar**
- **NO debería aparecer "Según tus gustos"**

### **2. Testear con recomendaciones:**
- Login
- Marca algunas películas como "Vistas" (con rating)
- Refresh la página
- **"Según tus gustos" debería aparecer arriba**
- Debería mostrar películas relacionadas a tus géneros favoritos

### **3. Testear diferentes niveles:**
Editá en Firestore `userProfiles/{userId}` para simular:

**Intermediate:**
```json
{
  "movieData": {
    "watched": [
      { "id": 123, "genre_ids": [18, 35], "rating": 5 },
      // ... 10-15 películas más
    ]
  }
}
```

**Expert:**
```json
{
  "movieData": {
    "watched": [
      { "id": 123, "genre_ids": [18], "popularity": 40, "rating": 5 },
      // ... 50+ películas, incluir algunas raras (popularity < 50)
    ]
  }
}
```

---

## ⚠️ **Notas Importantes**

### **Performance:**
- Fetch inicial carga **12 colecciones en paralelo** (Promise.all)
- Recomendaciones se cargan **después** si hay películas vistas
- No bloquea el render inicial

### **Optimización futuras:**
- Lazy load de secciones (solo cargar las visibles)
- Cache de recomendaciones (no re-fetch en cada visita)
- Infinite scroll en carruseles (fetch más películas on demand)

### **Estado actual:**
- ✅ Todas las colecciones originales restauradas
- ✅ "Según tus gustos" agregado y funcional
- ✅ Scroll horizontal con snap points
- ✅ Scrollbar oculta para UX limpia
- ✅ Responsive (200px fixed width funciona en mobile y desktop)

---

## 🎬 **Diferencias vs Versión Anterior**

| Antes (Fase 2 original) | Ahora (Híbrido) |
|-------------------------|-----------------|
| Secciones dinámicas según nivel | Todas las colecciones siempre visibles |
| Solo 4-6 secciones | 13+ colecciones |
| Grid layout | Scroll horizontal |
| Contexto temporal integrado | Contexto solo en "Según tus gustos" |

---

## ✅ **Resumen**

**Lo que se mantiene:**
- ✅ Onboarding modal
- ✅ Sistema de recomendaciones
- ✅ User profiler
- ✅ Optimistic UI en MovieContext

**Lo que cambió:**
- ✅ DiscoverView ahora es **híbrido**: colecciones fijas + 1 sección personalizada
- ✅ Layout de scroll horizontal (como antes)
- ✅ "Según tus gustos" solo aparece con data suficiente

**Resultado:**
- Mejor para discovery (más opciones visibles)
- Personalización sutil pero efectiva
- Respeta la estructura original que ya funcionaba
