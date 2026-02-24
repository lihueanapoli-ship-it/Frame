import { OSCAR_BEST_PICTURE_WINNERS } from '../constants/oscarWinners';
import { getMovieDetails } from './tmdb';

export const getOscarWinners = async () => {
    try {
        const winnerIds = Array.from(OSCAR_BEST_PICTURE_WINNERS);

        const moviesPromises = winnerIds.map(id =>
            getMovieDetails(id).catch(err => {
                console.warn(`Failed to fetch Oscar winner ${id}:`, err);
                return null;
            })
        );

        const movies = await Promise.all(moviesPromises);

        const validMovies = movies
            .filter(movie => movie !== null)
            .sort((a, b) => {
                const dateA = new Date(a.release_date || '1900-01-01');
                const dateB = new Date(b.release_date || '1900-01-01');
                return dateB - dateA;
            });

        return validMovies;
    } catch (error) {
        console.error('[Oscar Winners] Error fetching winners:', error);
        return [];
    }
};
