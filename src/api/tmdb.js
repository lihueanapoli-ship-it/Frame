import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

if (!API_KEY) {
    console.error("❌ TMDB API KEY is missing! Check VITE_TMDB_API_KEY in your env vars.");
}

const BASE_URL = 'https://api.themoviedb.org/3';

const tmdbClient = axios.create({
    baseURL: BASE_URL,
    params: {
        api_key: API_KEY,
        language: 'es-MX', // Default
    },
});

export const setApiLanguage = (lang) => {
    tmdbClient.defaults.params.language = lang;
};

const GENRES = {
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
    878: 'Ciencia ficción',
    10770: 'TV Movie',
    53: 'Suspense',
    10752: 'Bélica',
    37: 'Western'
};

export const getGenreNames = (ids) => {
    if (!ids || !ids.length) return [];
    return ids.map(id => GENRES[id]).filter(Boolean);
};

export const searchMovies = async (query) => {
    if (!query) return [];
    try {
        const response = await tmdbClient.get('/search/movie', {
            params: { query },
        });
        return response.data.results;
    } catch (error) {
        console.error("Error searching movies:", error);
        return [];
    }
};

export const getMovieDetails = async (id) => {
    try {
        const response = await tmdbClient.get(`/movie/${id}`, {
            params: { append_to_response: 'credits,recommendations' }
        });

        let data = response.data;

        // Fallback for overview if empty (fetch English)
        if (!data.overview) {
            try {
                const enResponse = await tmdbClient.get(`/movie/${id}`, {
                    params: { language: 'en-US' }
                });
                if (enResponse?.data?.overview) {
                    data.overview = enResponse.data.overview;
                }
            } catch (e) {
                // Ignore fallback error
            }
        }

        return data;
    } catch (error) {
        console.error("Error getting movie details:", error);
        return null;
    }
};

// ... existing imports

export const getTopRatedMovies = async () => {
    try {
        const response = await tmdbClient.get('/movie/top_rated');
        return response.data.results;
    } catch (error) {
        console.error("Error getting top rated movies:", error);
        return [];
    }
};



export const getList = async (listId) => {
    try {
        const response = await tmdbClient.get(`/list/${listId}`);
        return response.data.items;
    } catch (error) {
        console.error(`Error getting list ${listId}:`, error);
        return [];
    }
};

export const getCustomCollection = async (type, page = 1) => {
    try {
        let params = { sort_by: 'popularity.desc', 'vote_count.gte': 100, page };

        switch (type) {
            case 'must_watch':
                // "Los Infaltables": High rating, high vote count. Classics.
                params = { ...params, 'vote_average.gte': 8.2, 'vote_count.gte': 10000, sort_by: 'vote_average.desc' };
                break;
            case 'short':
                // "Cortitas y al Pie": <= 90 mins
                params = { ...params, 'with_runtime.lte': 90, 'vote_count.gte': 500, sort_by: 'popularity.desc' };
                break;
            case 'conversation':
                // "Mate y Sobremesa": Dramas, indie feel.
                params = { ...params, with_genres: '18', without_genres: '28,878,27', 'vote_average.gte': 7.5, sort_by: 'popularity.desc' };
                break;
            case 'tech':
                // "El Laboratorio": Sci-Fi
                params = { ...params, with_genres: '878', sort_by: 'popularity.desc' };
                break;
            case 'argentina':
                // "El Aguante" handled by with_origin_country below, just setting basic params here
                params = { ...params, region: 'AR', sort_by: 'popularity.desc' };
                break;
            case 'thriller':
                // "Pulso a Mil": Thriller/Mystery
                params = { ...params, with_genres: '53,9648', sort_by: 'popularity.desc' };
                break;
            case 'romance':
                // "Primera Cita": Romance, Comedy
                params = { ...params, with_genres: '10749,35', 'vote_average.gte': 7, sort_by: 'popularity.desc' };
                break;
            case 'real_life':
                // "Misiones de Verdad": History, Documentary or based on true story keyword
                params = { ...params, with_keywords: '9672', sort_by: 'popularity.desc' }; // 9672 = based on true story
                break;
            case 'sagas':
                // "Viaje de Ida": Collections/Franchises. Keywords: trilogy(180547), sequel(933), franchise.
                // Best logic: High revenue adventure/fantasy
                params = { ...params, with_genres: '12,14', sort_by: 'revenue.desc' };
                break;
            case 'classic_author':
                // "Solo para Locos": Low popularity but high rating? Or known auteur keywords?
                // Let's try "Arthouse" logic: High rating, lower vote count cap? Or specific keywords like "surrealism", "philosophical".
                // Keyword: 2398 (surrealism), 390 (neo-noir), 14750 (cult film)
                params = { ...params, with_keywords: '2398|390|14750', sort_by: 'vote_average.desc', 'vote_count.gte': 200 };
                break;
            default:
                break;
        }

        // Special handling for Argentina strictly
        if (type === 'argentina') {
            const response = await tmdbClient.get('/discover/movie', {
                params: { ...params, with_origin_country: 'AR' }
            });
            return response.data.results;
        }

        const response = await tmdbClient.get('/discover/movie', { params });
        return response.data.results;

    } catch (error) {
        console.error(`Error getting collection ${type}:`, error);
        return [];
    }
};

export const getMoviesByGenre = async (genreId, extraParams = {}, page = 1) => {
    try {
        const response = await tmdbClient.get('/discover/movie', {
            params: {
                with_genres: genreId,
                sort_by: 'popularity.desc',
                page,
                ...extraParams
            }
        });
        return response.data.results;
    } catch (error) {
        console.error(`Error getting movies for genre ${genreId}:`, error);
        return [];
    }
};

/**
 * Get similar movies to a given movie ID
 */
export const getSimilarMovies = async (movieId) => {
    try {
        const response = await tmdbClient.get(`/movie/${movieId}/similar`);
        return response.data.results;
    } catch (error) {
        console.error(`Error getting similar movies for ${movieId}:`, error);
        return [];
    }
};

/**
 * Discover movies with custom parameters
 */
export const discoverMovies = async (params = {}) => {
    try {
        const response = await tmdbClient.get('/discover/movie', { params });
        return response.data.results;
    } catch (error) {
        console.error('Error discovering movies:', error);
        return [];
    }
};

/**
 * Get movies by director (using person ID)
 */
export const getDirectorMovies = async (directorId) => {
    try {
        const response = await tmdbClient.get('/discover/movie', {
            params: {
                with_crew: directorId,
                sort_by: 'popularity.desc'
            }
        });
        return response.data.results;
    } catch (error) {
        console.error(`Error getting movies for director ${directorId}:`, error);
        return [];
    }
};


export const getTrendingMovies = async (page = 1) => {
    try {
        const response = await tmdbClient.get('/trending/movie/week', {
            params: { page }
        });
        return response.data.results;
    } catch (error) {
        console.error("Error getting trending movies:", error);
        return [];
    }
};

// Image helpers
export const getPosterUrl = (path, size = 'w500') => {
    if (!path) return 'https://via.placeholder.com/500x750?text=No+Poster';
    return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const getBackdropUrl = (path, size = 'w1280') => {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
}

export const getMovieVideos = async (id) => {
    try {
        // Try default language (es-MX)
        const response = await tmdbClient.get(`/movie/${id}/videos`);
        let results = response.data.results;

        // Fallback: If no results, try English (en-US)
        if (!results || results.length === 0) {
            const fallback = await tmdbClient.get(`/movie/${id}/videos`, {
                params: { language: 'en-US' }
            });
            results = fallback.data.results;
        }
        return results;
    } catch (error) {
        console.error(`Error getting videos for ${id}:`, error);
        return [];
    }
};
