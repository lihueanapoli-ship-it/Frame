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
export const useMovieFilter = (movies, { search = '', sort = 'date_added', status = 'all', genres = [] }) => {

    const filteredMovies = useMemo(() => {
        if (!movies) return [];

        return movies.filter(movie => {
            // 1. Status Filter
            // If movie has a status property, respect it. If not (legacy/context data), ignore status filter if 'all'.
            // Since LibraryView passes 'all' now, this is safe.
            if (status !== 'all' && movie.status && movie.status !== status) return false;

            // 2. Genre Filter - Fixed to check g.id
            if (genres.length > 0) {
                if (!movie.genres || !movie.genres.some(g => genres.includes(g.id))) return false;
            }

            // 3. Search Filter
            if (search.trim()) {
                const query = search.toLowerCase();
                return movie.title.toLowerCase().includes(query);
            }

            return true;
        }).sort((a, b) => {
            // 4. Sorting Logic
            switch (sort) {
                case 'rating':
                    // Sort by user rating
                    return (b.rating || 0) - (a.rating || 0);

                case 'year':
                    const dateA = new Date(a.release_date || 0);
                    const dateB = new Date(b.release_date || 0);
                    return dateB - dateA;

                case 'date_added':
                default:
                    // Support addedAt (watchlist) or watchedAt (watched)
                    const timeA = new Date(a.addedAt || a.watchedAt || 0);
                    const timeB = new Date(b.addedAt || b.watchedAt || 0);
                    return timeB - timeA;
            }
        });
    }, [movies, search, sort, status, genres]);

    return { filteredMovies, totalCount: filteredMovies.length };
};
