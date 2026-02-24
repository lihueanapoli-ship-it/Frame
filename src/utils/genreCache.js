import { getMovieDetails } from '../api/tmdb';

const STORAGE_KEY = 'cinetrack_genres_cache';

const loadCache = () => {
    try {
        const cached = localStorage.getItem(STORAGE_KEY);
        return cached ? JSON.parse(cached) : {};
    } catch (e) {
        console.error('Error loading genre cache:', e);
        return {};
    }
};

const saveCache = (cache) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error('Error saving genre cache:', e);
    }
};

export async function getGenresForMovies(movies, onProgress) {
    const cache = loadCache();
    let hasChanges = false;

    const missing = movies.filter(m => !cache[m.id]);

    if (missing.length === 0) {
        return cache;
    }

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
                        runtime: details.runtime || 0,
                        production_countries: details.production_countries || [],
                        popularity: details.popularity || 0
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

        if (i + BATCH_SIZE < missing.length) {
            await new Promise(r => setTimeout(r, 200));
        }
    }

    if (hasChanges) {
        saveCache(cache);
    }

    return cache;
}

export function getCachedGenres() {
    return loadCache();
}
