import {
    discoverMovies,
    getMoviesByGenre,
    getSimilarMovies,
    getMovieDetails
} from '../api/tmdb';

import { getGenresForMovies } from './genreCache';

export async function getPersonalizedRecommendations(userData, expertiseLevel = 'novice') {
    const { watched = [], watchlist = [] } = userData?.movieData || {};

    if (watched.length === 0) {
        return { forYou: [], basedOnGenres: [], similar: [], deepCuts: [] };
    }

    try {
        const watchedWithDetails = await fetchMovieDetails(watched);
        const profile = analyzeUserProfile(watchedWithDetails);

        if (profile.topGenres.length < 1) {
            return { forYou: [], basedOnGenres: [], similar: [], deepCuts: [] };
        }

        // Calculate Average Threshold based on Top 3 Genres (or whatever is available)
        const top3ForThreshold = profile.topGenres.slice(0, 3);
        const avgOfTop3 = top3ForThreshold.reduce((sum, g) => sum + g.avgRating, 0) / top3ForThreshold.length;
        const minThreshold = Math.floor(avgOfTop3); // e.g. 8.4 -> 8.0

        console.log(`[Tu ADN] Top Genres: ${top3ForThreshold.map(g => g.name).join(', ')}`);
        console.log(`[Tu ADN] Min Threshold: ${minThreshold}`);

        // Fetch candidates centering on these top genres
        const [genreBased, similarBased] = await Promise.all([
            getGenreFocusedCandidates(profile, minThreshold, watched, watchlist),
            getSimilarBasedRecommendations(watchedWithDetails, watched, watchlist)
        ]);

        const allCandidates = removeDuplicates([...genreBased, ...similarBased]);

        // Filter and Rank strictly by Genre Intersection
        const scoredMovies = rankByGenreIntersection(allCandidates, profile, minThreshold);

        return {
            forYou: scoredMovies.slice(0, 50),
            basedOnGenres: removeDuplicates(genreBased).slice(0, 20),
            similar: removeDuplicates(similarBased).slice(0, 20),
            deepCuts: [] // Simplifying core ADN per request
        };

    } catch (error) {
        console.error('[Tu ADN] ❌ Error:', error);
        return { forYou: [], basedOnGenres: [], similar: [], deepCuts: [] };
    }
}

async function fetchMovieDetails(movies) {
    const cache = await getGenresForMovies(movies);

    const results = movies.map(movie => {
        const cachedData = cache[movie.id];
        if (!cachedData) return null;

        return {
            ...movie,
            genres: cachedData.genres || [],
            release_date: cachedData.release_date || movie.release_date,
            runtime: cachedData.runtime || 0,
            userRating: movie.rating || 0,
            popularity: cachedData.popularity || movie.popularity || 0
        };
    });

    return results.filter(m => m !== null);
}

function analyzeUserProfile(watchedWithDetails) {
    const genreScores = {};
    const decades = {};
    let totalRating = 0;
    let ratedCount = 0;

    watchedWithDetails.forEach(movie => {
        const rating = movie.userRating || 0;

        if (movie.genres && rating > 0) {
            movie.genres.forEach(genre => {
                if (!genreScores[genre.id]) {
                    genreScores[genre.id] = {
                        id: genre.id,
                        name: genre.name,
                        score: 0,
                        count: 0
                    };
                }
                genreScores[genre.id].score += rating;
                genreScores[genre.id].count += 1;
            });
        }

        if (movie.release_date) {
            const year = new Date(movie.release_date).getFullYear();
            const decade = Math.floor(year / 10) * 10;
            decades[decade] = (decades[decade] || 0) + (rating > 7 ? 2 : 1);
        }

        if (rating > 0) {
            totalRating += rating;
            ratedCount++;
        }
    });

    // Sort genres by average user rating
    const topGenres = Object.values(genreScores)
        .map(g => ({
            ...g,
            avgRating: g.score / g.count
        }))
        .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count);

    const topDecades = Object.entries(decades)
        .map(([decade, weight]) => ({ decade: parseInt(decade), weight }))
        .sort((a, b) => b.weight - a.weight);

    return {
        topGenres,
        topDecades,
        avgRating: ratedCount > 0 ? totalRating / ratedCount : 7.0,
        totalWatched: watchedWithDetails.length
    };
}

async function getGenreFocusedCandidates(profile, minThreshold, watched, watchlist) {
    const top3Ids = profile.topGenres.slice(0, 3).map(g => g.id);
    if (top3Ids.length === 0) return [];

    try {
        // Source 1: Strict intersection (ALL 3)
        const strictPromise = top3Ids.length === 3
            ? discoverMovies({
                with_genres: top3Ids.join(','), // AND
                'vote_average.gte': minThreshold,
                'vote_count.gte': 100,
                sort_by: 'vote_average.desc'
            }) : Promise.resolve([]);

        // Source 2: Broad intersection (ANY of Top 3)
        const broadPromise = discoverMovies({
            with_genres: top3Ids.join('|'), // OR
            'vote_average.gte': minThreshold,
            'vote_count.gte': 500, // Higher count for quality when OR logic
            sort_by: 'vote_average.desc'
        });

        const [strict, broad] = await Promise.all([strictPromise, broadPromise]);

        return filterWatched([...strict, ...broad], watched, watchlist);
    } catch (e) {
        console.error('[Tu ADN] Genre candidates error:', e);
        return [];
    }
}

async function getSimilarBasedRecommendations(watchedWithDetails, watched, watchlist) {
    const lovedMovies = watchedWithDetails
        .filter(m => (m.userRating || 0) >= 9)
        .sort((a, b) => (b.userRating || 0) - (a.userRating || 0))
        .slice(0, 5);

    if (lovedMovies.length === 0) return [];

    try {
        const similarPromises = lovedMovies.map(movie =>
            getSimilarMovies(movie.id).catch(() => [])
        );

        const results = await Promise.all(similarPromises);
        return filterWatched(results.flat(), watched, watchlist);
    } catch (error) {
        return [];
    }
}

function rankByGenreIntersection(movies, profile, threshold) {
    const top3Ids = profile.topGenres.slice(0, 3).map(g => g.id);

    return movies
        .map(movie => {
            const intersection = (movie.genre_ids || []).filter(id => top3Ids.includes(id)).length;

            // Tiered Scoring:
            // 3 matches = base 100
            // 2 matches = base 50
            // 1 match = base 10
            // 0 matches = -1000 (Filter out)
            let score = 0;
            if (intersection === 3) score = 100;
            else if (intersection === 2) score = 50;
            else if (intersection === 1) score = 10;
            else score = -1000;

            // Rating bonus: How much it exceeds the threshold
            if (movie.vote_average) {
                score += (movie.vote_average - threshold) * 10;
            }

            return { ...movie, tuAdnScore: score };
        })
        .filter(movie => movie.tuAdnScore > 0 && (movie.vote_average || 0) >= threshold)
        .sort((a, b) => b.tuAdnScore - a.tuAdnScore || b.vote_average - a.vote_average);
}

function filterWatched(movies, watched, watchlist) {
    const watchedIds = new Set(watched.filter(m => m && m.id).map(m => m.id));
    const watchlistIds = new Set(watchlist.filter(m => m && m.id).map(m => m.id));

    return movies.filter(movie =>
        movie && movie.id && !watchedIds.has(movie.id) && !watchlistIds.has(movie.id)
    );
}

function removeDuplicates(movies) {
    const seen = new Set();
    return movies.filter(movie => {
        if (!movie || !movie.id || seen.has(movie.id)) return false;
        seen.add(movie.id);
        return true;
    });
}

export default {
    getPersonalizedRecommendations
};
