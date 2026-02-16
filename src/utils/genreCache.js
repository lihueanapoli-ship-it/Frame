import { getMovieDetails } from '../api/tmdb';

const STORAGE_KEY = 'cinetrack_genres_cache';

/**
 * Loads cached genres from local storage
 */
const loadCache = () => {
    try {
        const cached = localStorage.getItem(STORAGE_KEY);
        return cached ? JSON.parse(cached) : {};
    } catch (e) {
        console.error('Error loading genre cache:', e);
        return {};
    }
};

/**
 * Saves genre cache to local storage
 */
const saveCache = (cache) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error('Error saving genre cache (likely quota exceeded):', e);
        // If quota exceeded, we might want to trim old entries, but for now just logging
    }
};

/**
 * Ensures all provided movies have their genres cached.
 * Fetches missing data from TMDB in batches.
 * 
 * @param {Array} movies - Array of movie objects { id }
 * @param {Function} onProgress - Optional callback (processed, total)
 * @returns {Promise<Object>} Map of movieId -> genres array
 */
export async function getGenresForMovies(movies, onProgress) {
    const cache = loadCache();
    let hasChanges = false;

    // Identify missing movies
    const missing = movies.filter(m => !cache[m.id]);

    if (missing.length === 0) {
        return cache;
    }

    console.log(`[GenreCache] 📥 Fetching genres for ${missing.length} new movies...`);

    // Fetch in batches of 5 to avoid rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        const batch = missing.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (movie) => {
            try {
                const details = await getMovieDetails(movie.id);
                if (details) {
                    cache[movie.id] = {
                        genres: details.genres || [],
                        release_date: details.release_date || null,
                        runtime: details.runtime || 0
                    };
                    hasChanges = true;
                }
            } catch (err) {
                console.warn(`[GenreCache] Failed to fetch ${movie.id}:`, err);
            }
        }));

        if (onProgress) {
            onProgress(Math.min(i + BATCH_SIZE, missing.length), missing.length);
        }

        // Small delay between batches
        if (i + BATCH_SIZE < missing.length) {
            await new Promise(r => setTimeout(r, 200));
        }
    }

    if (hasChanges) {
        saveCache(cache);
        console.log('[GenreCache] ✅ Cache updated');
    }

    return cache;
}

/**
 * Synchronous access to currently cached genres
 */
export function getCachedGenres() {
    return loadCache();
}
