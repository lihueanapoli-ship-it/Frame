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

export const getCustomCollection = async (type) => {
    try {
        let params = { sort_by: 'popularity.desc', 'vote_count.gte': 100 };

        switch (type) {
            case 'oscars':
                // Strict "Best Picture Winners" using a community maintained list ID (e.g. 634 or similar)
                // We use List ID 634 ("Academy Award Best Picture Winners") or a reliable one.
                const oscarList = await getList('634');
                if (oscarList && oscarList.length > 0) {
                    // Sort Chronologically Reverse (Newest first)
                    return oscarList.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
                }
                // Fallback if list fetch fails
                params = { sort_by: 'vote_average.desc', 'vote_count.gte': 5000, without_genres: '16,99', with_awards: true };
                break;
            case 'argentina':
                params = { with_original_language: 'es', region: 'AR', sort_by: 'popularity.desc' };
                // TMDB filter for Argentina as production country is 'with_origin_country=AR'
                break;
            case 'short':
                params = { 'with_runtime.lte': 90, sort_by: 'popularity.desc', 'vote_average.gte': 7 };
                break;
            case 'mind_bending':
                // Keywords: mindfuck, psychological thriller, philosophy
                params = { with_keywords: '1701|9866|156094', sort_by: 'popularity.desc' };
                break;
            case 'hidden_gems':
                params = { 'vote_average.gte': 8.0, 'vote_count.lte': 3000, 'vote_count.gte': 100, sort_by: 'vote_average.desc' };
                break;
            case 'cult':
                params = { with_keywords: '9799', sort_by: 'vote_count.desc' }; // 9799 = cult film
                break;
            case 'true_story':
                params = { with_keywords: '9672|3205', sort_by: 'popularity.desc' }; // based on true story
                break;
            case 'visuals':
                // Hard to filter by visuals. We'll use a specific director list or high budget sci-fi
                params = { with_genres: '878,14', 'vote_average.gte': 7.5, sort_by: 'popularity.desc' };
                break;
            case 'sagas':
                // Collections. We can't fetch collections easily in discover. 
                // We will fetch simple popular franchise movies via keyword 'sequel' or similar?
                // Better: Just fetch popular movies, many are sagas.
                params = { with_keywords: '11322', sort_by: 'revenue.desc' }; // Franchise keyword? No reliable one.
                // Fallback to high revenue
                params = { sort_by: 'revenue.desc' };
                break;
            case 'conversation':
                // Drama + Romance, no Action
                params = { with_genres: '18,10749', without_genres: '28,878,12', sort_by: 'vote_average.desc' };
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

export const getMoviesByGenre = async (genreId) => {
    try {
        const response = await tmdbClient.get('/discover/movie', {
            params: {
                with_genres: genreId,
                sort_by: 'popularity.desc'
            }
        });
        return response.data.results;
    } catch (error) {
        console.error(`Error getting movies for genre ${genreId}:`, error);
        return [];
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
