import { useMemo } from 'react';

// Status constants
export const MOVIE_STATUS = {
    WATCHLIST: 'watchlist',
    WATCHED: 'watched'
};

/**
 * useMovieFilter Hook
 * Filters and sorts movies.
 * Updated to support ratingSource ('tmdb' or 'user') and proper genre/runtime handling.
 * Both user and TMDB ratings now use a 0-10 scale.
 */
export const useMovieFilter = (movies, {
    search = '',
    sort = 'date_added',
    status = 'all',
    genres = [],
    minRating = 0,
    runtime = 'any', // 'any', 'short', 'medium', 'long'
    yearRange = { min: 1900, max: new Date().getFullYear() + 5 },
    ratingSource = 'tmdb' // 'tmdb' | 'user'
}) => {

    const filteredMovies = useMemo(() => {
        if (!movies) return [];

        return movies.filter(movie => {
            // 1. Status Filter
            if (status !== 'all' && movie.status && movie.status !== status) return false;

            // 2. Genre Filter
            if (genres.length > 0) {
                // Normalize genre extraction: support both 'genre_ids' (array of Int) and 'genres' (array of Obj)
                const movieGenreIds = movie.genre_ids || movie.genres?.map(g => g.id) || [];
                // Check if movie has ANY of the selected genres
                if (!movieGenreIds.some(id => genres.includes(id))) return false;
            }

            // 3. Search Filter
            if (search.trim()) {
                const query = search.toLowerCase();
                if (!movie.title.toLowerCase().includes(query)) return false;
            }

            // 4. Rating Filter
            // Standardized 0-10 scale for both sources
            let r = 0;
            if (ratingSource === 'user') {
                r = movie.rating || 0;
            } else {
                r = movie.vote_average || 0;
            }

            if (minRating > 0 && r < minRating) return false;

            // 5. Runtime Filter
            const mins = movie.runtime || 0;
            if (runtime !== 'any' && mins === 0) return false; // Exclude if unknown

            if (runtime === 'short' && mins >= 90) return false; // < 90
            if (runtime === 'medium' && (mins < 90 || mins > 120)) return false; // 90-120
            if (runtime === 'long' && mins <= 120) return false; // > 120

            // 6. Year Filter
            const y = movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : 0;
            if (y > 0) { // Only filter if year exists
                if (y < yearRange.min || y > yearRange.max) return false;
            }

            return true;
        }).sort((a, b) => {
            // Sorting Logic
            switch (sort) {
                case 'rating':
                    const rateA = ratingSource === 'user' ? (a.rating || 0) : (a.vote_average || 0);
                    const rateB = ratingSource === 'user' ? (b.rating || 0) : (b.vote_average || 0);
                    return rateB - rateA;
                case 'year':
                    const dateA = new Date(a.release_date || 0);
                    const dateB = new Date(b.release_date || 0);
                    return dateB - dateA; // Newest first
                case 'runtime': return (b.runtime || 0) - (a.runtime || 0);
                case 'date_added':
                default:
                    const timeA = new Date(a.addedAt || a.watchedAt || 0);
                    const timeB = new Date(b.addedAt || b.watchedAt || 0);
                    return timeB - timeA; // Newest added first
            }
        });
    }, [movies, search, sort, status, genres, minRating, runtime, yearRange, ratingSource]);

    return { filteredMovies, totalCount: filteredMovies.length };
};
