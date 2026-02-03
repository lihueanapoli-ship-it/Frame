import { useMemo } from 'react';

// Status constants
export const MOVIE_STATUS = {
    WATCHLIST: 'watchlist',
    WATCHED: 'watched'
};

/**
 * useMovieFilter Hook
 * Filters and sorts movies.
 * Updated to support correct data properties (addedAt, rating, release_date).
 */
export const useMovieFilter = (movies, {
    search = '',
    sort = 'date_added',
    status = 'all',
    genres = [],
    minRating = 0,
    runtime = 'any', // 'any', 'short', 'medium', 'long'
    yearRange = { min: 1900, max: new Date().getFullYear() + 5 }
}) => {

    const filteredMovies = useMemo(() => {
        if (!movies) return [];

        return movies.filter(movie => {
            // 1. Status Filter
            if (status !== 'all' && movie.status && movie.status !== status) return false;

            // 2. Genre Filter
            if (genres.length > 0) {
                if (!movie.genres || !movie.genres.some(g => genres.includes(g.id))) return false;
            }

            // 3. Search Filter
            if (search.trim()) {
                const query = search.toLowerCase();
                if (!movie.title.toLowerCase().includes(query)) return false;
            }

            // 4. Rating Filter (Only relevant if movie is rated or we only show rated ones?)
            // If minRating > 0, exclude unrated or low rated.
            const r = movie.rating || 0;
            if (minRating > 0 && r < minRating) return false;

            // 5. Runtime Filter
            const mins = movie.runtime || 0;
            if (runtime === 'short' && (mins === 0 || mins >= 90)) return false;
            if (runtime === 'medium' && (mins < 90 || mins > 120)) return false;
            if (runtime === 'long' && mins <= 120) return false;

            // 6. Year Filter
            const y = movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : 0;
            if (y > 0) { // Only filter if year exists
                if (y < yearRange.min || y > yearRange.max) return false;
            }

            return true;
        }).sort((a, b) => {
            // Sorting Logic
            switch (sort) {
                case 'rating': return (b.rating || 0) - (a.rating || 0);
                case 'year':
                    const dateA = new Date(a.release_date || 0);
                    const dateB = new Date(b.release_date || 0);
                    return dateB - dateA;
                case 'runtime': return (b.runtime || 0) - (a.runtime || 0);
                case 'date_added':
                default:
                    const timeA = new Date(a.addedAt || a.watchedAt || 0);
                    const timeB = new Date(b.addedAt || b.watchedAt || 0);
                    return timeB - timeA;
            }
        });
    }, [movies, search, sort, status, genres, minRating, runtime, yearRange]);

    return { filteredMovies, totalCount: filteredMovies.length };
};
