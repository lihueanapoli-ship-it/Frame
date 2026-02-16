/**
 * User Profiler - Sistema de Perfilado Implícito
 * 
 * Calcula el "expertise level" del usuario basándose en comportamiento,
 * NO en preguntas explícitas.
 * 
 * Esto permite adaptar la UI de manera progresiva:
 * - Novatos: UI simplificada, tooltips, colecciones populares
 * - Intermedios: Shortcuts, colecciones personalizadas
 * - Expertos: Bulk actions, data densa, deep cuts
 */

/**
 * Calcula el nivel de expertise del usuario
 * @param {Object} userData - Datos del usuario desde FireStore
 * @param {Array} userData.watched - Películas vistas
 * @param {Array} userData.watchlist - Películas en watchlist
 * @param {Object} userData.behaviorMetrics - Métricas de comportamiento
 * @returns {'novice' | 'intermediate' | 'expert'}
 */
export function calculateExpertiseLevel(userData) {
    if (!userData) return 'novice';

    let score = 0;
    const { watched = [], watchlist = [], behaviorMetrics = {} } = userData;

    // ========================================
    // FACTOR 1: Tamaño de Biblioteca
    // ========================================
    const totalMovies = watched.length + watchlist.length;

    if (totalMovies < 10) {
        score += 0; // Novato
    } else if (totalMovies < 50) {
        score += 10; // Intermedio
    } else if (totalMovies < 100) {
        score += 20;
    } else {
        score += 30; // Experto
    }

    // ========================================
    // FACTOR 2: Diversidad de Géneros
    // ========================================
    const genres = new Set();
    watched.forEach(movie => {
        if (movie.genres) {
            movie.genres.forEach(g => genres.add(g));
        }
    });

    const genreCount = genres.size;
    if (genreCount > 10) score += 10; // Explora muchos géneros
    else if (genreCount > 5) score += 5;

    // ========================================
    // FACTOR 3: Películas "Raras" (Popularity < 50)
    // ========================================
    const obscureMovies = watched.filter(m => m.popularity && m.popularity < 50);
    const obscureRatio = obscureMovies.length / Math.max(watched.length, 1);

    if (obscureRatio > 0.3) score += 15; // 30%+ son películas raras
    else if (obscureRatio > 0.1) score += 5;

    // ========================================
    // FACTOR 4: Uso de Features Avanzadas
    // ========================================
    const {
        searchCount = 0,
        filterUsage = 0,
        statsViewCount = 0,
        reviewsWritten = 0, // Futuro
    } = behaviorMetrics;

    // Búsqueda activa (no solo discovery)
    if (searchCount > 20) score += 5;

    // Uso de filtros (sorting, géneros, años)
    if (filterUsage > 10) score += 5;

    // Visita Stats frecuentemente (interés en metadata)
    if (statsViewCount > 5) score += 5;

    // Reviews (futuro social)
    if (reviewsWritten > 0) score += 10;

    // ========================================
    // FACTOR 5: Consistency (Racha de días)
    // ========================================
    const { currentStreak = 0 } = behaviorMetrics;

    if (currentStreak > 30) score += 10; // Usa la app consistentemente
    else if (currentStreak > 7) score += 5;

    // ========================================
    // CLASIFICACIÓN FINAL
    // ========================================
    if (score < 15) return 'novice';
    if (score < 40) return 'intermediate';
    return 'expert';
}

/**
 * Obtiene recomendaciones de UI adaptadas al nivel de usuario
 * @param {'novice' | 'intermediate' | 'expert'} level
 * @returns {Object} Configuración de UI
 */
export function getUIConfigForLevel(level) {
    const configs = {
        novice: {
            showTooltips: true,
            showOnboarding: true,
            defaultView: 'grid', // Visual, menos denso
            enableBulkActions: false,
            recommendationStyle: 'popular', // Películas conocidas
            showAdvancedFilters: false,
            enableKeyboardShortcuts: false,
        },
        intermediate: {
            showTooltips: false,
            showOnboarding: false,
            defaultView: 'grid',
            enableBulkActions: false,
            recommendationStyle: 'personalized', // Basado en gustos
            showAdvancedFilters: true,
            enableKeyboardShortcuts: true,
        },
        expert: {
            showTooltips: false,
            showOnboarding: false,
            defaultView: 'list', // Más denso, más metadata
            enableBulkActions: true,
            recommendationStyle: 'deep-cuts', // Películas raras
            showAdvancedFilters: true,
            enableKeyboardShortcuts: true,
        }
    };

    return configs[level] || configs.novice;
}

/**
 * Incrementa contador de comportamiento
 * @param {string} userId
 * @param {string} metricName - Nombre de la métrica (searchCount, filterUsage, etc.)
 * @param {number} increment - Cantidad a incrementar (default: 1)
 */
export async function trackBehavior(userId, metricName, increment = 1) {
    // Esta función será implementada en UserProfileContext
    // para sincronizar con Firebase
    console.log(`[Profiler] Track: ${metricName} +${increment} for user ${userId}`);
}

/**
 * Calcula la racha actual de días consecutivos usando la app
 * @param {Array} activityLog - Array de timestamps de actividad
 * @returns {number} Días consecutivos
 */
export function calculateCurrentStreak(activityLog = []) {
    if (!activityLog.length) return 0;

    // Ordenar por fecha descendente
    const sorted = [...activityLog].sort((a, b) => new Date(b) - new Date(a));

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const timestamp of sorted) {
        const activityDate = new Date(timestamp);
        activityDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((currentDate - activityDate) / (1000 * 60 * 60 * 24));

        if (diffDays === streak) {
            streak++;
            currentDate = activityDate;
        } else if (diffDays > streak) {
            break; // Racha rota
        }
    }

    return streak;
}

/**
 * Analiza géneros favoritos del usuario
 * @param {Array} watched - Películas vistas
 * @returns {Array} Top 3 géneros con porcentaje
 */
export function analyzeGenrePreferences(watched = []) {
    const genreCount = {};

    watched.forEach(movie => {
        if (movie.genres) {
            movie.genres.forEach(genre => {
                genreCount[genre] = (genreCount[genre] || 0) + 1;
            });
        }
    });

    const total = watched.length || 1;
    const genreArray = Object.entries(genreCount)
        .map(([genre, count]) => ({
            genre,
            count,
            percentage: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    return genreArray;
}

/**
 * Detecta si el usuario tiene sesgo temporal (décadas favoritas)
 * @param {Array} watched
 * @returns {Object} Década favorita y porcentaje
 */
export function analyzeDecadePreference(watched = []) {
    const decadeCount = {};

    watched.forEach(movie => {
        if (movie.release_date) {
            const year = new Date(movie.release_date).getFullYear();
            const decade = Math.floor(year / 10) * 10;
            decadeCount[decade] = (decadeCount[decade] || 0) + 1;
        }
    });

    const total = watched.length || 1;
    const topDecade = Object.entries(decadeCount)
        .map(([decade, count]) => ({
            decade: `${decade}s`,
            count,
            percentage: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.count - a.count)[0];

    return topDecade || { decade: 'N/A', count: 0, percentage: 0 };
}

export default {
    calculateExpertiseLevel,
    getUIConfigForLevel,
    trackBehavior,
    calculateCurrentStreak,
    analyzeGenrePreferences,
    analyzeDecadePreference
};
