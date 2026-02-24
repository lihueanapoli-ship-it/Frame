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
            expertiseLevel === 'expert' || watched.length > 50
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
            userRating: movie.rating || 0,
            popularity: movie.popularity || 0
        };
    });

    return results.filter(m => m !== null);
}

function analyzeUserProfile(watchedWithDetails) {
    const genreScores = {};
    const decades = {};
    let totalRating = 0;
    let ratedCount = 0;
    let obscureCount = 0;

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

        if (movie.popularity && movie.popularity < 30) {
            obscureCount++;
        }
    });

    const topGenres = Object.values(genreScores)
        .map(g => ({
            ...g,
            avgScore: g.score / g.count,
            percentage: Math.round((g.count / watchedWithDetails.length) * 100)
        }))
        .sort((a, b) => b.avgScore - a.avgScore || b.count - a.count);

    const topDecades = Object.entries(decades)
        .map(([decade, count]) => ({ decade: parseInt(decade), count }))
        .sort((a, b) => b.count - a.count);

    return {
        topGenres,
        topDecades,
        avgRating: ratedCount > 0 ? totalRating / ratedCount : 7.0,
        totalWatched: watchedWithDetails.length,
        prefersPopular: calculatePopularityPreference(watchedWithDetails),
        obscureRatio: obscureCount / Math.max(watchedWithDetails.length, 1)
    };
}

function calculatePopularityPreference(movies) {
    const avgPopularity = movies.reduce((sum, m) => sum + (m.popularity || 0), 0) / movies.length;
    return avgPopularity > 40;
}

async function getGenreBasedRecommendations(profile, watched, watchlist) {
    if (profile.topGenres.length === 0) return [];

    try {
        const top5Genres = profile.topGenres.slice(0, 5);
        const genrePromises = top5Genres.map(g =>
            discoverMovies({
                with_genres: g.id,
                sort_by: 'vote_average.desc',
                'vote_count.gte': profile.prefersPopular ? 1000 : 150,
                'vote_average.gte': Math.max(profile.avgRating - 1, 6.5),
                'primary_release_date.gte': profile.topDecades.length > 0 ? `${profile.topDecades[0].decade - 20}-01-01` : '1900-01-01'
            }).catch(() => [])
        );

        const results = await Promise.all(genrePromises);
        const combined = removeDuplicates(results.flat());

        return filterWatched(combined, watched, watchlist);
    } catch (error) {
        console.error('[Tu ADN] Error in genre-based:', error);
        return [];
    }
}

async function getSimilarBasedRecommendations(watchedWithDetails, watched, watchlist) {
    // Seed with top 10 best rated movies (8+)
    const topRated = watchedWithDetails
        .filter(m => (m.userRating || 0) >= 8)
        .sort((a, b) => (b.userRating || 0) - (a.userRating || 0) || (b.vote_average || 0) - (a.vote_average || 0))
        .slice(0, 10);

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
        const topGenreId = profile.topGenres[0].id;

        const movies = await discoverMovies({
            with_genres: topGenreId,
            sort_by: 'vote_average.desc',
            'vote_count.gte': 50,
            'vote_count.lte': 800,
            'vote_average.gte': 7.2
        });

        return filterWatched(movies, watched, watchlist);
    } catch (error) {
        console.error('[Tu ADN] Error in deep cuts:', error);
        return [];
    }
}

function scoreAndRank(movies, profile) {
    const topGenreIds = profile.topGenres.slice(0, 7).map(g => g.id);
    const favoriteDecades = profile.topDecades.slice(0, 3).map(d => d.decade);

    const scored = movies.map(movie => {
        let score = 0;

        if (movie.genre_ids) {
            movie.genre_ids.forEach((id, index) => {
                const genreIndex = topGenreIds.indexOf(id);
                if (genreIndex === 0) score += 25; // Top 1 genre
                else if (genreIndex > 0 && genreIndex < 3) score += 15; // Top 2-3
                else if (genreIndex >= 3) score += 8; // Top 4-7
            });
        }

        if (movie.vote_average) {
            const diff = Math.abs(movie.vote_average - profile.avgRating);
            if (diff < 0.5) score += 15;
            else if (diff < 1.0) score += 8;

            // Quality bonus
            if (movie.vote_average > 8.0) score += 5;
        }

        if (movie.release_date) {
            const year = new Date(movie.release_date).getFullYear();
            const decade = Math.floor(year / 10) * 10;
            if (favoriteDecades.includes(decade)) {
                score += favoriteDecades[0] === decade ? 12 : 6;
            }
        }

        // Niche modifier
        if (profile.obscureRatio > 0.2 && movie.vote_count < 1000) {
            score += 10;
        } else if (profile.obscureRatio < 0.1 && movie.popularity > 100) {
            score += 5;
        }

        return { ...movie, tuAdnScore: score };
    });

    return scored
        .sort((a, b) => b.tuAdnScore - a.tuAdnScore || b.vote_average - a.vote_average)
        .slice(0, 50);
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
