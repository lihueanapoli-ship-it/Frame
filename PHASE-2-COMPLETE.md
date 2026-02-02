# 🎬 FRAME - Fase 2: Adaptatividad Completada

## ✅ Cambios Implementados

### 1. **OnboardingModal** (`src/components/onboarding/OnboardingModal.jsx`)

Modal inteligente que aparece al primer uso de la app.

**Funcionalidad:**
- ✅ Detecta usuarios nuevos (sin `onboardingCompleted`)
- ✅ Pide agregar 5 películas favoritas (mínimo)
- ✅ Máximo 10 películas seleccionables
- ✅ Search con debounce (300ms)
- ✅ UI visual con posters y selección checkboxes
- ✅ Skippable ("Explorar sin personalizar")
- ✅ Celebración sutil al completar

**UX Justification:**
- **NO preguntamos "¿Sos cinéfilo?"** → Aprendemos del comportamiento
- **5 películas es suficiente** → No abrumar al usuario
- **Skippable** → No forzar si quieren explorar primero
- **Visual** → Más engaging que un form de texto

**Integración:**
```jsx
// En App.jsx
const { profile } = useUserProfile();
const [showOnboarding, setShowOnboarding] = useState(false);

useEffect(() => {
  if (user && profile && !profile.onboardingCompleted) {
    setShowOnboarding(true);
  }
}, [user, profile]);

<OnboardingModal
  isOpen={showOnboarding}
  onComplete={() => setShowOnboarding(false)}
/>
```

**Screenshots esperados:**
- Step 1: Intro con Sparkles icon
- Step 2: Search + Grid de películas + Selected chips
- Al completar: Modal se cierra, usuario ve Discover personalizado

---

### 2. **Sistema de Recomendaciones** (`src/utils/recommendations.js`)

Sistema de recomendaciones basado en comportamiento del usuario.

**Algoritmos:**

#### `getPersonalizedRecommendations(userData, expertiseLevel)`
Retorna:
- `forYou`: Mix de las mejores recomendaciones
- `basedOnGenres`: Basado en géneros favoritos
- `similar`: Similares a películas rankeadas alto
- `deepCuts`: Películas raras (solo para expertos)

**Factores considerados:**
1. **Géneros favoritos** → Analiza biblioteca, calcula % por género
2. **Películas rankeadas 4-5 estrellas** → Busca similares
3. **Popularidad** → Para expertos, filtra películas menos conocidas
4. **Filtrado inteligente** → No muestra películas ya vistas/en watchlist

#### `getContextualCollections(userData)`
Retorna colecciones basadas en **contexto temporal**:

- **22:00-06:00**: "🌙 Para ver esta noche" (< 2hs, no intensas)
- **19:00-22:00**: "🎬 Prime Time" (cualquier cosa)
- **06:00-12:00**: "☀️ Energía matutina" (comedias, livianas)
- **Fin de semana**: "🍿 Maratón" (épicas, > 2.5hs)

**Ejemplo de uso:**
```javascript
const recommendations = await getPersonalizedRecommendations(
  profile, 
  'intermediate'
);

console.log(recommendations.forYou); // Top 15 películas recomendadas
console.log(recommendations.similar); // Similares a favoritas
```

---

### 3. **DiscoverView Adaptativo** (Refactorizado)

La vista principal ahora se adapta según `expertiseLevel`.

#### **NOVICE** (< 15 points)
**Filosofía:** Facilitar decisiones, evitar abrumar

**Secciones:**
1. 🔥 Tendencias → "Lo más visto de la semana"
2. ⭐ Mejor Rankeadas → "Películas que aman todos"
3. 🎬 Los Infaltables → "Clásicos que tenés que ver"
4. ⏱️ Cortitas y al Pie → "Menos de 90 minutos"

**Justificación:**
- Secciones populares, universales
- Textos simples y directos
- No hay recomendaciones personalizadas (aún no hay suficiente data)

---

#### **INTERMEDIATE** (15-39 points)
**Filosofía:** Mix de popular + personalizado

**Secciones:**
1. 🎯 **Basado en tus gustos** → Personalizado por género favorito
2. 🔥 Tendencias → Popular ahora
3. 🔗 **En la misma línea** → Similares a películas rankeadas alto
4. 🎭 Pulso a Mil → Thriller/Misterio
5. 💕 Primera Cita → Romance/Comedia

**Justificación:**
- 50% personalizado, 50% curado
- "Porque te gustó X" aparece como subtítulo
- Permite descubrir mientras se personaliza

---

#### **EXPERT** (40+ points)
**Filosofía:** Curación avanzada, deep cuts, contexto

**Secciones:**
1. 🧠 **Curado para tu perfil avanzado** → ML-style (sin ML real, pero similar)
2. 🕒 **Contextual temporal** → Según hora/día (ej: "Para ver esta noche")
3. 💎 **Joyas ocultas** → Películas raras pero alta calidad
4. 🔥 Trending (Reference) → Solo 5 películas (menos espacio)
5. 🎨 Solo para Locos → Cine de autor/experimental
6. 🇦🇷 El Aguante → Cine argentino

**Justificación:**
- Prioriza contenido único y raro
- Trending ocupa menos espacio (experto ya conoce lo popular)
- Contexto temporal (hora del día) es relevante
- Metadata densa (futuro: mostrar director, año, runtime en cards)

---

### 4. **Nuevas Funciones en TMDB API** (`src/api/tmdb.js`)

```javascript
// Similares a una película
export const getSimilarMovies = async (movieId) => { ... }

// Discover genérico con params custom
export const discoverMovies = async (params = {}) => { ... }

// Películas de un director
export const getDirectorMovies = async (directorId) => { ... }

// getMoviesByGenre ahora acepta extraParams
export const getMoviesByGenre = async (genreId, extraParams = {}, page = 1) => { ... }
```

Estas funciones permiten:
- Filtros avanzados (runtime, vote_count range, etc.)
- Búsqueda de películas similares
- Explorar filmografía de directores

---

## 🏗️ Flujo Completo

### **Usuario Nuevo (Primera Vez)**
1. Login con Google
2. `UserProfileContext` detecta `onboardingCompleted: false`
3. **OnboardingModal aparece**
4. Usuario busca y selecciona 5 películas favoritas
5. Click "Continuar"
6. Películas se agregan a watchlist
7. `UserProfileContext.completeOnboarding()` → marca como completo
8. Modal se cierra
9. **DiscoverView recalcula** → nivel intermediate (porque ya tiene 5+ movies)
10. Usuario ve contenido personalizado inmediatamente

### **Usuario Returning (Novice → Intermediate)**
1. Login
2. Profile carga: `expertiseLevel: 'novice'` (5 películas en biblioteca)
3. DiscoverView muestra: Tendencias, Top Rated, Infaltables
4. Usuario agrega 10 películas más (total: 15)
5. `UserProfileContext` recalcula → `expertiseLevel: 'intermediate'`
6. **DiscoverView se actualiza automáticamente**
7. Aparece sección "🎯 Basado en tus gustos"

### **Usuario Returning (Intermediate → Expert)**
1. Login
2. Profile carga: `expertiseLevel: 'intermediate'` (30 películas)
3. Usuario usa Stats view frecuentemente, filtra por género, busca películas raras
4. `trackBehavior('statsViewCount')`, `trackBehavior('filterUsage')`
5. Score pasa de 35 → 45
6. **Level up a Expert**
7. DiscoverView ahora muestra: Deep Cuts, Contexto temporal, Solo para Locos

---

## 📊 Métricas de Éxito (Fase 2)

✅ **OnboardingModal funciona:** Detecta nuevos usuarios correctamente  
✅ **Recommendations System:** Genera listas personalizadas  
✅ **DiscoverView adaptativo:** Muestra contenido diferente según nivel  
✅ **Contexto visible:** Cada sección tiene subtítulo explicativo  
✅ **HMR funciona:** Dev server actualiza sin errores  

⏳ **Falta (Fase 3):**
- Micro-interactions (hover en MovieCard → preview trailer)
- Loading skeletons (en lugar de spinners)
- Confetti al completar onboarding
- Toast notifications para errores

---

## 🧪 Cómo Probar Fase 2

### **1. Testear Onboarding (sin Firebase)**
Si no tenés Firebase configurado, el onboarding no va a aparecer porque no hay user. Para testearlo:

1. Configurar Firebase (agregar keys al `.env`)
2. Login con Google
3. En Firestore, eliminar `onboardingCompleted` de tu perfil
4. Refresh la página → debería aparecer el modal

### **2. Testear Niveles Adaptativos**

Para simular diferentes niveles, editá manualmente tu perfil en Firestore:

**Novice:**
```json
{
  "movieData": {
    "watched": [movie1, movie2], // 2 películas
    "watchlist": []
  },
  "behaviorMetrics": {
    "searchCount": 2,
    "filterUsage": 0
  }
}
```

**Intermediate:**
```json
{
  "movieData": {
    "watched": [...25 películas...],
    "watchlist": []
  },
  "behaviorMetrics": {
    "searchCount": 15,
    "filterUsage": 5
  }
}
```

**Expert:**
```json
{
  "movieData": {
    "watched": [...60 películas...], // incluir algunas con popularity < 50
    "watchlist": []
  },
  "behaviorMetrics": {
    "searchCount": 30,
    "filterUsage": 20,
    "statsViewCount": 10
  }
}
```

Luego refresh y DiscoverView debería mostrar secciones diferentes.

### **3. Testear Contexto Temporal**

Para ver "🌙 Para ver esta noche", simplemente abrí la app entre las 22:00-06:00.

Para testear sin esperar, podés modificar temporalmente `recommendations.js`:

```javascript
const hour = 23; // Force late night
```

---

## 🎯 Diferencias Visuales Esperadas

### **Novice vs Expert (Side by Side)**

| Novice | Expert |
|--------|--------|
| 🔥 Tendencias | 🧠 Curado para tu perfil |
| ⭐ Mejor Rankeadas | 🕒 Para ver esta noche |
| 🎬 Los Infaltables | 💎 Joyas ocultas |
| ⏱️ Cortitas y al Pie | 🔥 Trending (5 items) |
| - | 🎨 Solo para Locos |
| - | 🇦🇷 El Aguante |

### **Subtítulos Contextuales**

| Nivel | Ejemplo Subtítulo |
|-------|------------------|
| Novice | "Películas que aman todos" |
| Intermediate | "Porque te gustó Relatos Salvajes" |
| Expert | "Algoritmo personalizado basado en tu biblioteca" |

---

## ⚠️ Notas Técnicas

### **Performance**
- Recommendations fetch es async → puede tomar 2-3s con conexión lenta
- DiscoverView muestra skeleton mientras carga
- Hero Carousel (trending) carga primero, luego sections

### **Firebase Schema Updates**
- `userProfiles/{userId}.onboardingCompleted`: Boolean
- `userProfiles/{userId}.onboardingCompletedAt`: Timestamp
- `userProfiles/{userId}.movieData.watched`: Array (sincronizado con MovieContext)

### **TMDB API Considerations**
- `getSimilarMovies()` puede retornar vacío para películas muy viejas
- `vote_count.gte` filtro es clave para evitar películas sin ratings
- Deep Cuts usa `vote_count: 50-500` (sweet spot para calidad + rareza)

---

## 🚀 Próximos Pasos (Fase 3)

1. **Micro-interactions:**
   - Hover en MovieCard → preview trailer (muted autoplay)
   - Confetti al completar onboarding
   - Animaciones de "add to watchlist"

2. **Loading States Premium:**
   - Skeletons con estructura real (no spinners)
   - Mensajes contextuales ("Buscando en 10,000 películas...")
   - Shimmer effect

3. **Nueva Sección: "Sorpréndeme":**
   - Mood slider (🎭 Intenso → 😌 Relajado)
   - Quick decision mode (swipe cards tipo Tinder)
   - Random from taste

4. **Smart Library:**
   - Collections automáticas ("Olvidadas hace 6 meses")
   - Timeline cinematográfica (eje X = año, eje Y = rating)
   - Heatmap de géneros

---

## 🎬 Conclusión Fase 2

**Lo que logramos:**
- ✅ Onboarding inteligente que aprende del comportamiento
- ✅ Sistema de recomendaciones funcional (sin ML pero smart)
- ✅ UI completamente adaptativa según expertise level
- ✅ Contexto visible en cada sección ("Por qué veo esto")
- ✅ Base sólida para features sociales (perfiles ya tienen toda la data)

**El salto de calidad:**
- **Antes:** Todos ven lo mismo, contenido estático
- **Ahora:** Cada usuario ve contenido personalizado, UI se adapta al nivel

**¿Continuamos con Fase 3 o testeamos a fondo Fase 2?** 🚀
