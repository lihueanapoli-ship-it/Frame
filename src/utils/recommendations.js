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

        const [genreBased, similarBased, deepCuts] = await Promise.all([
            getGenreBasedRecommendations(profile, watched, watchlist),
            getSimilarBasedRecommendations(watchedWithDetails, watched, watchlist),
            expertiseLevel === 'expert'
                ? getDeepCuts(profile, watched, watchlist)
                : Promise.resolve([])
        ]);

        const scoredMovies = scoreAndRank(
            [...genreBased, ...similarBased, ...deepCuts],
            profile
        );

        return {
            forYou: scoredMovies,
            basedOnGenres: genreBased.slice(0, 20),
            similar: similarBased.slice(0, 20),
            deepCuts: deepCuts.slice(0, 15)
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
            userRating: movie.rating || 0
        };
    });

    return results.filter(m => m !== null);
}

function analyzeUserProfile(watchedWithDetails) {
    const genreMap = {
        28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia',
        80: 'Crimen', 99: 'Documental', 18: 'Drama', 10751: 'Familia',
        14: 'Fantasía', 36: 'Historia', 27: 'Terror', 10402: 'Música',
        9648: 'Misterio', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller',
        10752: 'Guerra', 37: 'Western'
    };

    const genreScores = {};
    const decades = {};
    let totalRating = 0;
    let ratedCount = 0;

    watchedWithDetails.forEach(movie => {
        const rating = movie.userRating || 0;

        if (movie.genres) {
            movie.genres.forEach(genre => {
                if (!genreScores[genre.id]) {
                    genreScores[genre.id] = {
                        id: genre.id,
                        name: genre.name,
                        score: 0,
                        count: 0
                    };
                }

                const weight = rating > 0 ? rating : 5;
                genreScores[genre.id].score += weight;
                genreScores[genre.id].count += 1;
            });
        }

        if (movie.release_date) {
            const year = new Date(movie.release_date).getFullYear();
            const decade = Math.floor(year / 10) * 10;
            decades[decade] = (decades[decade] || 0) + 1;
        }

        if (rating > 0) {
            totalRating += rating;
            ratedCount++;
        }
    });

    const topGenres = Object.values(genreScores)
        .map(g => ({
            ...g,
            avgScore: g.score / g.count,
            percentage: Math.round((g.count / watchedWithDetails.length) * 100)
        }))
        .sort((a, b) => b.avgScore - a.avgScore);

    const topDecades = Object.entries(decades)
        .map(([decade, count]) => ({ decade: parseInt(decade), count }))
        .sort((a, b) => b.count - a.count);

    return {
        topGenres,
        topDecades,
        avgRating: ratedCount > 0 ? totalRating / ratedCount : 7.0,
        totalWatched: watchedWithDetails.length,
        prefersPopular: calculatePopularityPreference(watchedWithDetails)
    };
}

function calculatePopularityPreference(movies) {
    const avgPopularity = movies.reduce((sum, m) => sum + (m.popularity || 0), 0) / movies.length;
    return avgPopularity > 50;
}

async function getGenreBasedRecommendations(profile, watched, watchlist) {
    if (profile.topGenres.length === 0) return [];

    try {
        const genreIds = profile.topGenres.slice(0, 3).map(g => g.id).join(',');

        const movies = await discoverMovies({
            with_genres: genreIds,
            sort_by: 'vote_average.desc',
            'vote_count.gte': profile.prefersPopular ? 500 : 100,
            'vote_average.gte': profile.avgRating - 1
        });

        return filterWatched(movies, watched, watchlist);
    } catch (error) {
        console.error('[Tu ADN] Error in genre-based:', error);
        return [];
    }
}

async function getSimilarBasedRecommendations(watchedWithDetails, watched, watchlist) {
    const topRated = watchedWithDetails
        .filter(m => (m.userRating || 0) >= 8)
        .sort((a, b) => (b.userRating || 0) - (a.userRating || 0))
        .slice(0, 5);

    if (topRated.length === 0) return [];

    try {
        const similarPromises = topRated.map(movie =>
            getSimilarMovies(movie.id).catch(() => [])
        );

        const similarResults = await Promise.all(similarPromises);
        const allSimilar = similarResults.flat();

        return filterWatched(
            removeDuplicates(allSimilar),
            watched,
            watchlist
        );
    } catch (error) {
        console.error('[Tu ADN] Error in similar-based:', error);
        return [];
    }
}

async function getDeepCuts(profile, watched, watchlist) {
    if (profile.topGenres.length === 0) return [];

    try {
        const topGenre = profile.topGenres[0].id;

        const movies = await discoverMovies({
            with_genres: topGenre,
            sort_by: 'vote_average.desc',
            'vote_count.gte': 50,
            'vote_count.lte': 500,
            'vote_average.gte': 7.0
        });

        return filterWatched(movies, watched, watchlist);
    } catch (error) {
        console.error('[Tu ADN] Error in deep cuts:', error);
        return [];
    }
}

function scoreAndRank(movies, profile) {
    const scored = movies.map(movie => {
        let score = 0;

        if (movie.genre_ids) {
            const topGenreIds = profile.topGenres.slice(0, 3).map(g => g.id);
            const genreMatches = movie.genre_ids.filter(id => topGenreIds.includes(id)).length;
            score += genreMatches * 10;
        }

        if (movie.vote_average) {
            const diff = Math.abs(movie.vote_average - profile.avgRating);
            if (diff < 1) score += 5;
        }

        if (movie.release_date && profile.topDecades.length > 0) {
            const year = new Date(movie.release_date).getFullYear();
            const decade = Math.floor(year / 10) * 10;
            if (profile.topDecades[0].decade === decade) score += 3;
        }

        return { ...movie, tuAdnScore: score };
    });

    return scored
        .sort((a, b) => b.tuAdnScore - a.tuAdnScore)
        .slice(0, 50);
}

function filterWatched(movies, watched, watchlist) {
    const watchedIds = new Set(watched.map(m => m.id));
    const watchlistIds = new Set(watchlist.map(m => m.id));

    return movies.filter(movie =>
        !watchedIds.has(movie.id) && !watchlistIds.has(movie.id)
    );
}

function removeDuplicates(movies) {
    const seen = new Set();
    return movies.filter(movie => {
        if (seen.has(movie.id)) return false;
        seen.add(movie.id);
        return true;
    });
}

export default {
    getPersonalizedRecommendations
};
