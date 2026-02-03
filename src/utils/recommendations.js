/**
 * 🧬 Tu ADN - Sistema Avanzado de Recomendaciones
 * 
 * Este sistema analiza profundamente el comportamiento del usuario:
 * 1. Géneros favoritos ponderados por rating (1-10 estrellas)
 * 2. Décadas preferidas
 * 3. Directores favoritos
 * 4. Películas similares a las mejor rankeadas (8-10 estrellas)
 * 5. Patterns de voting (prefiere películas populares vs indie)
 * 
 * Todo basado en data real del usuario.
 */

import {
    discoverMovies,
    getMoviesByGenre,
    getSimilarMovies,
    getMovieDetails
} from '../api/tmdb';

/**
 * Obtiene recomendaciones ultra-personalizadas "Tu ADN"
 * @param {Object} userData - Profile data del usuario
 * @param {string} expertiseLevel - 'novice' | 'intermediate' | 'expert'
 * @returns {Array} Top 20 películas personalizadas
 */
export async function getPersonalizedRecommendations(userData, expertiseLevel = 'novice') {
    const { watched = [], watchlist = [] } = userData?.movieData || {};

    if (watched.length === 0) {
        return { forYou: [], basedOnGenres: [], similar: [], deepCuts: [] };
    }

    try {
        console.log('[Tu ADN] 🧬 Analizando perfil cinematográfico...');

        // ========================================
        // PASO 1: Fetch detalles de películas vistas
        // (necesitamos genre_ids que no guardamos)
        // ========================================
        const watchedWithDetails = await fetchMovieDetails(watched);
        console.log('[Tu ADN] 📊 Películas analizadas:', watchedWithDetails.length);

        // ========================================
        // PASO 2: Analizar perfil del usuario
        // ========================================
        const profile = analyzeUserProfile(watchedWithDetails);
        console.log('[Tu ADN] 🎯 Géneros favoritos:', profile.topGenres.slice(0, 3).map(g => g.name));
        console.log('[Tu ADN] ⭐ Rating promedio:', profile.avgRating);

        // ========================================
        // PASO 3: Generar recomendaciones por categoría
        // ========================================
        const [genreBased, similarBased, deepCuts] = await Promise.all([
            getGenreBasedRecommendations(profile, watched, watchlist),
            getSimilarBasedRecommendations(watchedWithDetails, watched, watchlist),
            expertiseLevel === 'expert'
                ? getDeepCuts(profile, watched, watchlist)
                : Promise.resolve([])
        ]);

        // ========================================
        // PASO 4: Scoring y ranking final
        // ========================================
        const scoredMovies = scoreAndRank(
            [...genreBased, ...similarBased, ...deepCuts],
            profile
        );

        console.log('[Tu ADN] ✅ Recomendaciones generadas:', scoredMovies.length);

        return {
            forYou: scoredMovies, // Devolver TODAS (hasta 50)
            basedOnGenres: genreBased.slice(0, 20),
            similar: similarBased.slice(0, 20),
            deepCuts: deepCuts.slice(0, 15)
        };

    } catch (error) {
        console.error('[Tu ADN] ❌ Error:', error);
        return { forYou: [], basedOnGenres: [], similar: [], deepCuts: [] };
    }
}

// ========================================
// PASO 1: FETCH MOVIE DETAILS
// ========================================

import { getGenresForMovies } from './genreCache';

/**
 * Fetch detalles completos de TODAS las películas usando caché
 * para evitar rate limits y permitir análisis completo.
 */
async function fetchMovieDetails(movies) {
    console.log(`[Tu ADN] 📥 Fetching details for ${movies.length} movies...`);

    // 1. Ensure we have cached details for ALL movies (fetch missing in background)
    // We don't await the full progress if it's too huge, but getGenresForMovies handles batching.
    // For better UX, we await it so stats are accurate first time.
    const cache = await getGenresForMovies(movies); // This now returns detailed cache { genres, release_date, runtime }

    // 2. Map cached data to movie objects
    const results = movies.map(movie => {
        const cachedData = cache[movie.id];

        if (!cachedData) return null; // Should not happen after await, unless API error

        return {
            ...movie,
            genres: cachedData.genres || [],
            release_date: cachedData.release_date || movie.release_date,
            runtime: cachedData.runtime || 0,
            userRating: movie.rating || 0
        };
    });

    return results.filter(m => m !== null);
}

// ========================================
// PASO 2: ANALYZE USER PROFILE
// ========================================

/**
 * Analiza el perfil cinematográfico del usuario
 * Retorna géneros favoritos, décadas, patterns de rating
 */
function analyzeUserProfile(watchedWithDetails) {
    // Mapa de géneros de TMDB
    const genreMap = {
        28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia',
        80: 'Crimen', 99: 'Documental', 18: 'Drama', 10751: 'Familia',
        14: 'Fantasía', 36: 'Historia', 27: 'Terror', 10402: 'Música',
        9648: 'Misterio', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller',
        10752: 'Guerra', 37: 'Western'
    };

    // Contar géneros ponderados por rating
    const genreScores = {};
    const decades = {};
    let totalRating = 0;
    let ratedCount = 0;

    watchedWithDetails.forEach(movie => {
        const rating = movie.userRating || 0;

        // Análisis de géneros (ponderado por rating 1-10 estrellas)
        if (movie.genres) {
            movie.genres.forEach(genre => {
                if (!genreScores[genre.id]) {
                    genreScores[genre.id] = {
                        id: genre.id,
                        name: genre.name,
                        score: 0,
                        count: 0
                    };
                }

                // Ponderar: películas con rating alto valen más
                // Escala 1-10: rating >= 8 es excelente, 5 es neutral
                const weight = rating > 0 ? rating : 5; // Default neutral (5/10)
                genreScores[genre.id].score += weight;
                genreScores[genre.id].count += 1;
            });
        }

        // Análisis de décadas
        if (movie.release_date) {
            const year = new Date(movie.release_date).getFullYear();
            const decade = Math.floor(year / 10) * 10;
            decades[decade] = (decades[decade] || 0) + 1;
        }

        // Rating promedio
        if (rating > 0) {
            totalRating += rating;
            ratedCount++;
        }
    });

    // Top géneros ordenados por score promedio
    const topGenres = Object.values(genreScores)
        .map(g => ({
            ...g,
            avgScore: g.score / g.count,
            percentage: Math.round((g.count / watchedWithDetails.length) * 100)
        }))
        .sort((a, b) => b.avgScore - a.avgScore);

    const topDecades = Object.entries(decades)
        .map(([decade, count]) => ({ decade: parseInt(decade), count }))
        .sort((a, b) => b.count - a.count);

    return {
        topGenres,
        topDecades,
        avgRating: ratedCount > 0 ? totalRating / ratedCount : 7.0, // Default neutral (7/10)
        totalWatched: watchedWithDetails.length,
        // Pattern: prefiere películas populares vs indie
        prefersPopular: calculatePopularityPreference(watchedWithDetails)
    };
}

/**
 * Calcula si el usuario prefiere películas populares o indie
 */
function calculatePopularityPreference(movies) {
    const avgPopularity = movies.reduce((sum, m) => sum + (m.popularity || 0), 0) / movies.length;
    return avgPopularity > 50; // Threshold arbitrario
}

// ========================================
// PASO 3A: GENRE-BASED RECOMMENDATIONS
// ========================================

/**
 * Recomendaciones basadas en géneros favoritos
 */
async function getGenreBasedRecommendations(profile, watched, watchlist) {
    if (profile.topGenres.length === 0) return [];

    try {
        // Tomar top 3 géneros
        const genreIds = profile.topGenres.slice(0, 3).map(g => g.id).join(',');

        // Fetch con filtros personalizados
        const movies = await discoverMovies({
            with_genres: genreIds,
            sort_by: 'vote_average.desc',
            'vote_count.gte': profile.prefersPopular ? 500 : 100,
            'vote_average.gte': profile.avgRating - 1 // Un punto menos que su promedio
        });

        return filterWatched(movies, watched, watchlist);
    } catch (error) {
        console.error('[Tu ADN] Error in genre-based:', error);
        return [];
    }
}

// ========================================
// PASO 3B: SIMILAR-BASED RECOMMENDATIONS
// ========================================

/**
 * Recomendaciones basadas en películas similares a las mejor rankeadas
 */
async function getSimilarBasedRecommendations(watchedWithDetails, watched, watchlist) {
    // Tomar top 5 películas con rating >= 8 (escala 1-10)
    const topRated = watchedWithDetails
        .filter(m => (m.userRating || 0) >= 8)
        .sort((a, b) => (b.userRating || 0) - (a.userRating || 0))
        .slice(0, 5);

    if (topRated.length === 0) return [];

    try {
        const similarPromises = topRated.map(movie =>
            getSimilarMovies(movie.id).catch(() => [])
        );

        const similarResults = await Promise.all(similarPromises);
        const allSimilar = similarResults.flat();

        return filterWatched(
            removeDuplicates(allSimilar),
            watched,
            watchlist
        );
    } catch (error) {
        console.error('[Tu ADN] Error in similar-based:', error);
        return [];
    }
}

// ========================================
// PASO 3C: DEEP CUTS (EXPERT ONLY)
// ========================================

/**
 * Joyas ocultas para usuarios expertos
 */
async function getDeepCuts(profile, watched, watchlist) {
    if (profile.topGenres.length === 0) return [];

    try {
        const topGenre = profile.topGenres[0].id;

        const movies = await discoverMovies({
            with_genres: topGenre,
            sort_by: 'vote_average.desc',
            'vote_count.gte': 50,
            'vote_count.lte': 500, // Menos conocidas
            'vote_average.gte': 7.0
        });

        return filterWatched(movies, watched, watchlist);
    } catch (error) {
        console.error('[Tu ADN] Error in deep cuts:', error);
        return [];
    }
}

// ========================================
// PASO 4: SCORING AND RANKING
// ========================================

/**
 * Asigna score a cada película basado en match con el perfil
 */
function scoreAndRank(movies, profile) {
    const scored = movies.map(movie => {
        let score = 0;

        // +10 puntos por cada género que matchea con top 3
        if (movie.genre_ids) {
            const topGenreIds = profile.topGenres.slice(0, 3).map(g => g.id);
            const genreMatches = movie.genre_ids.filter(id => topGenreIds.includes(id)).length;
            score += genreMatches * 10;
        }

        // +5 puntos si vote_average está cerca del avgRating del usuario
        if (movie.vote_average) {
            const diff = Math.abs(movie.vote_average - profile.avgRating);
            if (diff < 1) score += 5;
        }

        // +3 puntos si es de una década favorita
        if (movie.release_date && profile.topDecades.length > 0) {
            const year = new Date(movie.release_date).getFullYear();
            const decade = Math.floor(year / 10) * 10;
            if (profile.topDecades[0].decade === decade) score += 3;
        }

        return { ...movie, tuAdnScore: score };
    });

    // Ordenar por score
    return scored
        .sort((a, b) => b.tuAdnScore - a.tuAdnScore)
        .slice(0, 50); // Top 50
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function filterWatched(movies, watched, watchlist) {
    const watchedIds = new Set(watched.map(m => m.id));
    const watchlistIds = new Set(watchlist.map(m => m.id));

    return movies.filter(movie =>
        !watchedIds.has(movie.id) && !watchlistIds.has(movie.id)
    );
}

function removeDuplicates(movies) {
    const seen = new Set();
    return movies.filter(movie => {
        if (seen.has(movie.id)) return false;
        seen.add(movie.id);
        return true;
    });
}

// ========================================
// EXPORTS
// ========================================

export default {
    getPersonalizedRecommendations
};
