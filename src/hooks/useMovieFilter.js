import { useMemo } from 'react';

// Status constants
export const MOVIE_STATUS = {
    WATCHLIST: 'watchlist',
    WATCHED: 'watched'
};

/**
 * useMovieFilter Hook
 * Filters and sorts a collection of movies based on user criteria.
 * 
 * @param {Array} movies - Array of movie objects from local state/firebase
 * @param {Object} filters - Filter criteria
 * @param {string} filters.search - Text search query (local)
 * @param {string} filters.sort - Sort key: 'date_added', 'rating', 'year'
 * @param {string} filters.status - 'watchlist' | 'watched' | 'all'
 * @param {Array} filters.genres - Array of genre IDs to include
 */
export const useMovieFilter = (movies, { search = '', sort = 'date_added', status = 'all', genres = [] }) => {

    const filteredMovies = useMemo(() => {
        if (!movies) return [];

        return movies.filter(movie => {
            // 1. Status Filter
            if (status !== 'all' && movie.status !== status) return false;

            // 2. Genre Filter (AND logic - must have at least one of the selected genres? Or all? Usually one is enough for discovery)
            // Let's go with: if genres selected, movie must have at least one matching genre.
            if (genres.length > 0) {
                if (!movie.genres || !movie.genres.some(g => genres.includes(g))) return false;
            }

            // 3. Search Filter (Title)
            if (search.trim()) {
                const query = search.toLowerCase();
                return movie.title.toLowerCase().includes(query);
            }

            return true;
        }).sort((a, b) => {
            // 4. Sorting Logic
            switch (sort) {
                case 'rating':
                    // Sort by user rating first, then global vote_average
                    const ratingA = a.my_rating || 0;
                    const ratingB = b.my_rating || 0;
                    return ratingB - ratingA; // Descending

                case 'year':
                    const dateA = new Date(a.release_date || 0);
                    const dateB = new Date(b.release_date || 0);
                    return dateB - dateA; // Newest first

                case 'date_added':
                default:
                    // Fallback to added_at timestamp
                    // Assuming added_at is a Firestore Timestamp or ISO string
                    const addedA = a.added_at instanceof Date ? a.added_at : new Date(a.added_at || 0);
                    const addedB = b.added_at instanceof Date ? b.added_at : new Date(b.added_at || 0);
                    return addedB - addedA; // Newest added first
            }
        });
    }, [movies, search, sort, status, genres]);

    return { filteredMovies, totalCount: filteredMovies.length };
};
