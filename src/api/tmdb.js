import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdbClient = axios.create({
    baseURL: BASE_URL,
    params: {
        api_key: API_KEY,
        language: 'es-MX', // Spanish by default as per request language (User spoke Spanish)
    },
});

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
        return response.data;
    } catch (error) {
        console.error("Error getting movie details:", error);
        return null;
    }
};

export const getTrendingMovies = async () => {
    try {
        const response = await tmdbClient.get('/trending/movie/week');
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
