/**
 * Recommendation System
 * 
 * Sistema básico de recomendaciones basado en:
 * 1. Géneros favoritos del usuario
 * 2. Directores en su biblioteca
 * 3. Películas similares a las que ya vio
 * 
 * Este sistema NO usa ML (eso es futuro), pero es inteligente
 * porque se basa en comportamiento real del usuario.
 */

import {
    discoverMovies,
    getMoviesByGenre,
    getSimilarMovies,
    getDirectorMovies
} from '../api/tmdb';

/**
 * Obtiene recomendaciones personalizadas para un usuario
 * @param {Object} userData - Profile data del usuario
 * @param {Array} userData.watched - Películas vistas
 * @param {Array} userData.watchlist - Watchlist
 * @param {string} expertiseLevel - 'novice' | 'intermediate' | 'expert'
 * @returns {Object} Categorías de recomendaciones
 */
export async function getPersonalizedRecommendations(userData, expertiseLevel = 'novice') {
    const { watched = [], watchlist = [] } = userData?.movieData || {};

    const recommendations = {
        forYou: [],
        basedOnGenres: [],
        similar: [],
        directors: [],
        deepCuts: []
    };

    try {
        // ========================================
        // 1. RECOMENDACIONES BASADAS EN GÉNEROS
        // ========================================
        const genrePreferences = analyzeGenres(watched);

        if (genrePreferences.length > 0) {
            const topGenre = genrePreferences[0];
            const genreMovies = await getMoviesByGenre(topGenre.id, {
                sort_by: 'vote_average.desc',
                'vote_count.gte': 100
            });

            // Filtrar las que ya vio
            const filtered = filterWatched(genreMovies, watched, watchlist);
            recommendations.basedOnGenres = filtered.slice(0, 20);
        }

        // ========================================
        // 2. PELÍCULAS SIMILARES
        // ========================================
        if (watched.length > 0) {
            // Tomar las 3 películas mejor rankeadas del usuario
            const topRated = [...watched]
                .filter(m => m.rating >= 4)
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 3);

            const similarPromises = topRated.map(movie =>
                getSimilarMovies(movie.id).catch(() => [])
            );

            const similarResults = await Promise.all(similarPromises);
            const allSimilar = similarResults.flat();

            recommendations.similar = filterWatched(
                removeDuplicates(allSimilar),
                watched,
                watchlist
            ).slice(0, 20);
        }

        // ========================================
        // 3. DEEP CUTS (Solo para expertos)
        // ========================================
        if (expertiseLevel === 'expert' && genrePreferences.length > 0) {
            const topGenre = genrePreferences[0];
            const deepCuts = await getMoviesByGenre(topGenre.id, {
                sort_by: 'vote_average.desc',
                'vote_count.gte': 50,
                'vote_count.lte': 500, // Películas menos conocidas
            });

            recommendations.deepCuts = filterWatched(deepCuts, watched, watchlist).slice(0, 15);
        }

        // ========================================
        // 4. CONSOLIDAR "FOR YOU"
        // ========================================
        // Mezclar las mejores de cada categoría
        recommendations.forYou = [
            ...recommendations.basedOnGenres.slice(0, 5),
            ...recommendations.similar.slice(0, 5),
            ...(recommendations.deepCuts.slice(0, 5) || [])
        ];

    } catch (error) {
        console.error('[Recommendations] Error getting personalized:', error);
    }

    return recommendations;
}

/**
 * Obtiene colecciones contextuales basadas en hora del día, etc.
 * @param {Object} userData
 * @returns {Object} Colecciones contextuales
 */
export function getContextualCollections(userData) {
    const hour = new Date().getHours();
    const { watched = [] } = userData?.movieData || {};

    const collections = [];

    // ========================================
    // CONTEXTO: Hora del día
    // ========================================
    if (hour >= 22 || hour < 6) {
        // Tarde noche: películas cortas, no muy intensas
        collections.push({
            id: 'late-night',
            title: '🌙 Para ver esta noche',
            subtitle: 'Menos de 2 horas, no demasiado intensas',
            filters: {
                'with_runtime.lte': 120,
                with_genres: '35,10749,16', // Comedia, Romance, Animación
            }
        });
    } else if (hour >= 19 && hour < 22) {
        // Prime time: cualquier cosa
        collections.push({
            id: 'prime-time',
            title: '🎬 Prime Time',
            subtitle: 'Las mejores para la noche de cine',
            filters: {
                sort_by: 'popularity.desc',
                'vote_average.gte': 7.5
            }
        });
    } else if (hour >= 6 && hour < 12) {
        // Mañana: lighter content
        collections.push({
            id: 'morning',
            title: '☀️ Energía matutina',
            subtitle: 'Comedias y películas livianas',
            filters: {
                with_genres: '35,10751', // Comedia, Familia
            }
        });
    }

    // ========================================
    // CONTEXTO: Fin de semana
    // ========================================
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        collections.push({
            id: 'weekend-marathon',
            title: '🍿 Maratón de Fin de Semana',
            subtitle: 'Épicas, sagas, trilogías',
            filters: {
                'with_runtime.gte': 150,
                sort_by: 'vote_average.desc'
            }
        });
    }

    return collections;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Analiza géneros favoritos del usuario
 */
function analyzeGenres(watched) {
    const genreCount = {};
    const genreIdMap = {
        28: 'Acción',
        12: 'Aventura',
        16: 'Animación',
        35: 'Comedia',
        80: 'Crimen',
        99: 'Documental',
        18: 'Drama',
        10751: 'Familia',
        14: 'Fantasía',
        36: 'Historia',
        27: 'Terror',
        10402: 'Música',
        9648: 'Misterio',
        10749: 'Romance',
        878: 'Sci-Fi',
        10770: 'TV Movie',
        53: 'Thriller',
        10752: 'Guerra',
        37: 'Western'
    };

    watched.forEach(movie => {
        if (movie.genre_ids) {
            movie.genre_ids.forEach(genreId => {
                genreCount[genreId] = (genreCount[genreId] || 0) + 1;
            });
        }
    });

    return Object.entries(genreCount)
        .map(([id, count]) => ({
            id: parseInt(id),
            name: genreIdMap[id] || 'Unknown',
            count,
            percentage: Math.round((count / watched.length) * 100)
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Filtra películas que el usuario ya vio o tiene en watchlist
 */
function filterWatched(movies, watched, watchlist) {
    const watchedIds = new Set(watched.map(m => m.id));
    const watchlistIds = new Set(watchlist.map(m => m.id));

    return movies.filter(movie =>
        !watchedIds.has(movie.id) && !watchlistIds.has(movie.id)
    );
}

/**
 * Remueve duplicados de un array de películas
 */
function removeDuplicates(movies) {
    const seen = new Set();
    return movies.filter(movie => {
        if (seen.has(movie.id)) return false;
        seen.add(movie.id);
        return true;
    });
}

/**
 * Genera título contextual basado en expertise level
 */
export function getContextualTitle(section, expertiseLevel, genrePreference) {
    const titles = {
        forYou: {
            novice: '🎬 Recomendado para vos',
            intermediate: `🎯 Basado en tus ${genrePreference || 'gustos'}`,
            expert: `🧠 Curado para tu perfil avanzado`
        },
        similar: {
            novice: '✨ Similares a las que te gustaron',
            intermediate: '🔗 En la misma línea',
            expert: '🎭 Afinidad cinematográfica'
        },
        deepCuts: {
            expert: '💎 Joyas ocultas de tu género favorito'
        }
    };

    return titles[section]?.[expertiseLevel] || titles[section]?.novice || section;
}

export default {
    getPersonalizedRecommendations,
    getContextualCollections,
    getContextualTitle
};
