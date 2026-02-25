import {
    discoverMovies,
    getMoviesByGenre,
    getSimilarMovies,
    getMovieDetails
} from '../api/tmdb';

import { getGenresForMovies } from './genreCache';

export async function getPersonalizedRecommendations(userData, expertiseLevel = 'novice') {
    const { watched = [], watchlist = [] } = userData?.movieData || {};
    const preferences = userData?.preferences || {};

    if (watched.length === 0) {
        return { forYou: [], basedOnGenres: [], similar: [], deepCuts: [] };
    }

    try {
        const watchedWithDetails = await fetchMovieDetails(watched);
        const profile = analyzeUserProfile(watchedWithDetails);

        if (profile.topGenres.length < 1) {
            return { forYou: [], basedOnGenres: [], similar: [], deepCuts: [] };
        }

        const top3ForThreshold = profile.topGenres.slice(0, 3);
        const avgOfTop3 = top3ForThreshold.reduce((sum, g) => sum + g.avgRating, 0) / (top3ForThreshold.length || 1);
        const minThreshold = Math.floor(avgOfTop3);

        console.log(`[Tu ADN] Top Genres: ${top3ForThreshold.map(g => g.name).join(', ')}`);
        console.log(`[Tu ADN] Target Min Rating: ${minThreshold}`);

        const [genreBased, similarBased] = await Promise.all([
            getGenreFocusedCandidates(profile, minThreshold, watched, watchlist),
            getSimilarBasedRecommendations(watchedWithDetails, watched, watchlist)
        ]);

        let allCandidates = removeDuplicates([...genreBased, ...similarBased]);

        // --- HYDRATE CANDIDATES (to get countries) ---
        allCandidates = await hydrateMovieData(allCandidates);

        // --- APPLY EXCLUSIONS ---
        allCandidates = filterByExclusions(allCandidates, preferences);

        let scoredMovies = rankByGenreIntersection(allCandidates, profile, minThreshold);

        if (scoredMovies.length < 50 && top3ForThreshold.length > 0) {
            let moreCandidates = await getBroadGenreCandidates(profile, minThreshold, watched, watchlist);
            moreCandidates = await hydrateMovieData(moreCandidates);
            const filteredMore = filterByExclusions(moreCandidates, preferences);
            allCandidates = removeDuplicates([...allCandidates, ...filteredMore]);
            scoredMovies = rankByGenreIntersection(allCandidates, profile, minThreshold);
        }

        return {
            forYou: scoredMovies.slice(0, 50),
            basedOnGenres: removeDuplicates(genreBased).slice(0, 20),
            similar: removeDuplicates(similarBased).slice(0, 20),
            deepCuts: []
        };

    } catch (error) {
        console.error('[Tu ADN] ❌ Error:', error);
        return { forYou: [], basedOnGenres: [], similar: [], deepCuts: [] };
    }
}

function filterByExclusions(movies, preferences) {
    const { excludedGenres = [], excludedCountries = [] } = preferences;

    if (excludedGenres.length === 0 && excludedCountries.length === 0) return movies;

    return movies.filter(movie => {
        // Check genres
        const genreIds = movie.genre_ids || [];
        const hasExcludedGenre = genreIds.some(id => excludedGenres.includes(id));
        if (hasExcludedGenre) return false;

        // Check countries (Comprehensive check)
        const countries = movie.production_countries || [];
        const originCountries = movie.origin_country || []; // TMDB often provides this in search/discover results

        const hasExcludedCountry =
            countries.some(c => excludedCountries.includes(c.iso_3166_1) || excludedCountries.includes(c.name)) ||
            originCountries.some(code => excludedCountries.includes(code));

        if (hasExcludedCountry) return false;

        return true;
    });
}

async function fetchMovieDetails(movies) {
    return await hydrateMovieData(movies, true);
}

async function hydrateMovieData(movies, isWatched = false) {
    if (!movies || movies.length === 0) return [];

    const cache = await getGenresForMovies(movies);

    const results = movies.map(movie => {
        const cachedData = cache[movie.id];
        // If it's not in cache and not watched (candidates), we keep the original object but try to use what we have
        const base = cachedData || {};

        return {
            ...movie,
            genres: base.genres || movie.genres || [],
            genre_ids: base.genres ? base.genres.map(g => g.id) : (movie.genre_ids || []),
            production_countries: base.production_countries || movie.production_countries || [],
            release_date: base.release_date || movie.release_date,
            runtime: base.runtime || movie.runtime || 0,
            userRating: isWatched ? (movie.rating || 0) : 0,
            popularity: base.popularity || movie.popularity || 0,
            origin_country: movie.origin_country || base.origin_country || []
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
        const promises = [];

        // Strict AND for all top 3 (Pages 1 & 2)
        if (top3Ids.length === 3) {
            promises.push(discoverMovies({ with_genres: top3Ids.join(','), 'vote_average.gte': minThreshold, 'vote_count.gte': 50, sort_by: 'vote_average.desc', page: 1 }));
            promises.push(discoverMovies({ with_genres: top3Ids.join(','), 'vote_average.gte': minThreshold, 'vote_count.gte': 50, sort_by: 'vote_average.desc', page: 2 }));
        }

        // OR for top 3 (Multiple pages)
        promises.push(discoverMovies({ with_genres: top3Ids.join('|'), 'vote_average.gte': minThreshold, 'vote_count.gte': 200, sort_by: 'vote_average.desc', page: 1 }));
        promises.push(discoverMovies({ with_genres: top3Ids.join('|'), 'vote_average.gte': minThreshold, 'vote_count.gte': 200, sort_by: 'vote_average.desc', page: 2 }));

        const results = await Promise.all(promises);
        return filterWatched(results.flat(), watched, watchlist);
    } catch (e) {
        console.error('[Tu ADN] Genre candidates error:', e);
        return [];
    }
}

async function getBroadGenreCandidates(profile, minThreshold, watched, watchlist) {
    const top3Ids = profile.topGenres.slice(0, 3).map(g => g.id);
    try {
        const promises = top3Ids.map(id =>
            discoverMovies({
                with_genres: id,
                'vote_average.gte': minThreshold,
                'vote_count.gte': 30, // Lower vote count to fill up
                sort_by: 'vote_average.desc',
                page: 1
            })
        );
        const results = await Promise.all(promises);
        return filterWatched(results.flat(), watched, watchlist);
    } catch (e) {
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
    const top3 = profile.topGenres.slice(0, 3);
    const top3Ids = top3.map(g => g.id);

    return movies
        .map(movie => {
            const genres = movie.genre_ids || [];
            const matches = genres.filter(id => top3Ids.includes(id));
            const intersection = matches.length;

            // RANK BONUS: Prioritize matches with the highest ranked user genres
            // #1 genre match = 3000, #2 = 2000, #3 = 1000
            let rankBonus = 0;
            matches.forEach(mId => {
                const rankIndex = top3Ids.indexOf(mId);
                if (rankIndex !== -1) rankBonus += (3 - rankIndex) * 1000;
            });

            let levelScore = 0;
            if (intersection === 3) {
                // Nivel 1: Películas que contienen los 3 géneros del Top al mismo tiempo y ningún otro
                if (genres.length === 3) levelScore = 1000000;
                // Nivel 2: Películas que contienen los 3 géneros del Top y otros también
                else levelScore = 500000;
            }
            // Nivel 3: Películas con 2 de tus géneros top.
            else if (intersection === 2) {
                levelScore = 100000;
            }
            // Nivel 4: Películas con al menos 1 de tus géneros top.
            else if (intersection === 1) {
                levelScore = 10000;
            }
            else {
                levelScore = -1000000;
            }

            // Quality is the tie-breaker within the same level and rank group
            const qualityScore = movie.vote_average ? (movie.vote_average * 10) : 0;

            return { ...movie, tuAdnScore: levelScore + rankBonus + qualityScore };
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
