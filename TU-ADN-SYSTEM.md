# 🧬 Tu ADN - Sistema Avanzado de Recomendaciones

## 🎯 **Qué es "Tu ADN"**

"Tu ADN" es un sistema inteligente de recomendaciones que analiza **profundamente** tu comportamiento cinematográfico para sugerirte películas que realmente van a gustarte.

No es simplemente "películas del mismo género". Es un análisis completo de:
- ✅ Géneros favoritos **ponderados por tus ratings**
- ✅ Décadas que más disfrutás
- ✅ Patterns de popularidad (¿preferís blockbusters o indie?)
- ✅ Similaridad con tus películas mejor rankeadas
- ✅ Nivel de expertise (novice/intermediate/expert)

---

## 🧠 **Cómo Funciona el Algoritmo**

### **Paso 1: Fetch de Detalles**

Como ahora guardamos solo datos stripped (id, title, poster), necesitamos traer detalles completos:

```javascript
// Fetch las 30 películas más recientes que viste
const watchedWithDetails = await fetchMovieDetails(watched);
```

Esto nos da:
- `genres` - Géneros de cada película
- `release_date` - Para análisis de décadas
- `popularity` - Para patterns

### **Paso 2: Análisis de Perfil**

```javascript
const profile = analyzeUserProfile(watchedWithDetails);
```

**Qué analiza:**
1. **Géneros Ponderados por Rating:**
   - Película con 10 estrellas → género vale 10 puntos
   - Película con 7 estrellas → género vale 7 puntos
   - Película sin rating → género vale 5 puntos (neutral)

2. **Décadas Favoritas:**
   - ¿Preferís cine de los 80s? ¿2000s? ¿clásico?

3. **Popularity Pattern:**
   - ¿Tu promedio de popularidad es alto? → Preferís blockbusters
   - ¿Es bajo? → Preferís cine indie/alternativo

4. **Rating Promedio:**
   - Usado para fitrar recomendaciones (no sugerir películas muy por debajo de tu estándar)

**Ejemplo de perfil:**
```javascript
{
  topGenres: [
    { id: 18, name: 'Drama', avgScore: 4.5, count: 15 },
    { id: 53, name: 'Thriller', avgScore: 4.2, count: 10 },
    { id: 80, name: 'Crimen', avgScore: 4.0, count: 8 }
  ],
  topDecades: [
    { decade: 2010, count: 12 },
    { decade: 2000, count: 8 }
  ],
  avgRating: 4.1,
  prefersPopular: false  // Prefiere indie
}
```

### **Paso 3: Generación de Recomendaciones**

Se generan 3 tipos de recomendaciones en paralelo:

#### **A) Genre-Based (Basadas en Géneros)**
```javascript
// Usa tus top 3 géneros
discoverMovies({
  with_genres: "18,53,80",  // Drama, Thriller, Crimen
  sort_by: 'vote_average.desc',
  'vote_count.gte': 100,  // o 500 si preferís popular
  'vote_average.gte': 3.1  // Tu avgRating - 1
})
```

#### **B) Similar-Based (Basadas en Similares)**
```javascript
// Toma tus películas con rating >= 8 estrellas (escala 1-10)
const topRated = watched
  .filter(m => m.userRating >= 8)
  .slice(0, 5);

// Fetch similares de cada una
topRated.forEach(movie => 
  getSimilarMovies(movie.id)
);
```

#### **C) Deep Cuts (Solo Experts)**
```javascript
// Joyas ocultas de tu género favorito
discoverMovies({
  with_genres: topGenre,
  'vote_count.gte': 50,
  'vote_count.lte': 500,  // Menos conocidas
  'vote_average.gte': 7.0
})
```

### **Paso 4: Scoring y Ranking**

Cada película recibe un score basado en match con tu perfil:

```javascript
let score = 0;

// +10 puntos por cada género que matchea con tus top 3
genreMatches * 10

// +5 puntos si vote_average está cerca de tu avgRating
if (|movie.vote_average - profile.avgRating| < 1)
  score += 5

// +3 puntos si es de tu década favorita
if (movieDecade === profile.topDecades[0])
  score += 3
```

Luego se ordenan por score y retornan las top 20.

---

## 📊 **Ejemplo Completo**

**Usuario vio:**
- Relatos Salvajes → 10★
- Parasite → 9★  
- The Father → 8★
- Inception → 7★
- Tenet → 5★

**Géneros:**
- Drama: (10 + 9 + 8 + 7) / 4 = 8.5 promedio → MUY alto peso
- Thriller: (9 + 8) / 2 = 8.5 promedio → MUY alto peso  
- Acción: (7 + 5) / 2 = 6.0 promedio → Peso medio

**Resultado:**
✅ Priorizará Drama y Thriller
⚠️ Acción tiene menos prioridad
🎯 Buscará similares SOLO a Relatos, Parasite y The Father (8+★)

**Recomendaciones generadas:**

*Genre-based:*
- The Father (Drama, 8.3★)
- Prisoners (Thriller, Crimen, 8.1★)
- A Prophet (Crimen, Drama, 7.9★)

*Similar-based (a Relatos Salvajes):*
- El Reino (Thriller, Drama argentino)
- Nine Queens (Crimen argentina)

*Deep Cuts:*
- Sound of Metal (Drama indie, vote_count: 450)
- The Guilty (Thriller indie, vote_count: 320)

**Score final:**
- The Father: 30 puntos (3 géneros match + cerca del rating + década correcta)
- Prisoners: 25 puntos (2 géneros match + cerca del rating)
- ...

---

## 🎯 **Qué Hace Únicas a estas Recomendaciones**

### **VS. Sistemas Básicos:**

❌ **Sistema básico:**
"Te gustó Drama? → Aquí hay dramas populares"

✅ **Tu ADN:**
"Viste 15 dramas y los rankeaste 4.5★ en promedio. También te gustan thrillers (4.2★) y crimen (4.0★). Preferís películas de los 2010s con popularidad moderada. Las que más te gustaron fueron Relatos Salvajes y Parasite. Basado en todo esto, te recomiendo..."

### **Ventajas:**

1. **Considera ratings:** Una película de 5★ pesa más que una de 3★
2. **Multi-género:** Combina tus top géneros
3. **Contextual:** Adapta según tu nivel de expertise
4. **Evolutivo:** Mientras más marcás, mejor te conoce
5. **Filtrado inteligente:** No sugiere películas muy por debajo de tu estándar

---

## 🧪 **Cómo Testear**

### **Para ver Tu ADN working:**

1. **Marcá 10-15 películas como vistas**
2. **Dale ratings (1-10 estrellas)** a al menos 5
3. **Ir a Discover**
4. **Abrir Console** (F12)
5. Deberías ver:
   ```
   [Tu ADN] 🧬 Analizando perfil cinematográfico...
   [Tu ADN] 📊 Películas analizadas: 15
   [Tu ADN] 🎯 Géneros favoritos: ['Drama', 'Thriller', 'Crimen']
   [Tu ADN] ⭐ Rating promedio: 4.2
   [Tu ADN] ✅ Recomendaciones generadas: 20
   ```

6. **Carrusel "Tu ADN"** debería mostrar películas personalizadas

### **Test de Calidad:**

- ✅ Las películas recomendadas deberían ser de tus géneros favoritos
- ✅ El rating promedio de sugerencias debería estar cerca del tuyo
- ✅ Si rankeaste 5★ a películas indie, debería sugerir más indie
- ✅ Si rankeaste 5★ a thrillers, debería priorizar thrillers

---

## 📈 **Mejoras Futuras**

1. **Director Preferences:** Analizar directores favoritos
2. **Actor Preferences:** Detectar actores que seguís
3. **Temporal Patterns:** Qué géneros ves según hora del día
4. **Mood Detection:** Basado en secuencia de vistas
5. **Collaborative Filtering:** Qué ven usuarios similares

---

## ✅ **Checklist de Funcionalidad**

- [ ] Tengo al menos 10 películas marcadas como vistas
- [ ] Al menos 5 tienen ratings asignados
- [ ] Veo logs de `[Tu ADN]` en Console
- [ ] El carrusel "Tu ADN" aparece con películas
- [ ] Las películas parecen alineadas con mis gustos
- [ ] Al agregar más películas, las recomendaciones mejoran

---

**Tu ADN es ahora un sistema verdaderamente personalizado que aprende de tus gustos reales.** Mientras más uses la app, mejor te conocerá. 🧬🎬
