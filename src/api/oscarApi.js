import { OSCAR_BEST_PICTURE_WINNERS } from '../constants/oscarWinners';
import { getMovieDetails } from './tmdb';

/**
 * Get all Oscar Best Picture winners sorted by year (newest first)
 * @returns {Promise<Array>} Array of movie objects sorted by release date descending
 */
export const getOscarWinners = async () => {
    try {
        // Convert Set to Array of IDs
        const winnerIds = Array.from(OSCAR_BEST_PICTURE_WINNERS);

        // Fetch details for all winners
        const moviesPromises = winnerIds.map(id =>
            getMovieDetails(id).catch(err => {
                console.warn(`Failed to fetch Oscar winner ${id}:`, err);
                return null;
            })
        );

        const movies = await Promise.all(moviesPromises);

        // Filter out nulls and sort by release date (newest first)
        const validMovies = movies
            .filter(movie => movie !== null)
            .sort((a, b) => {
                const dateA = new Date(a.release_date || '1900-01-01');
                const dateB = new Date(b.release_date || '1900-01-01');
                return dateB - dateA; // Descending order
            });

        console.log('[Oscar Winners] Fetched and sorted:', validMovies.length, 'winners');

        return validMovies;
    } catch (error) {
        console.error('[Oscar Winners] Error fetching winners:', error);
        return [];
    }
};
