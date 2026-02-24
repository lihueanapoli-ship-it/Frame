export async function getPersonalizedRecommendations(userData, expertiseLevel = 'novice') {
    const { watched = [], watchlist = [] } = userData?.movieData || {};

    if (watched.length === 0) {
        return { forYou: [], basedOnGenres: [], similar: [], deepCuts: [] };
    }

    try {
        const watchedWithDetails = await fetchMovieDetails(watched);
        const profile = analyzeUserProfile(watchedWithDetails);

        // Increase seeds from top-rated movies for better similarity
        const [genreBased, similarBased, deepCuts] = await Promise.all([
            getGenreBasedRecommendations(profile, watched, watchlist),
            getSimilarBasedRecommendations(watchedWithDetails, watched, watchlist),
            expertiseLevel === 'expert' || watched.length > 50
                ? getDeepCuts(profile, watched, watchlist)
                : Promise.resolve([])
        ]);

        // Merge all candidates and REMOVE DUPLICATES BEFORE SCORING
        const allCandidates = removeDuplicates([...genreBased, ...similarBased, ...deepCuts]);

        const scoredMovies = scoreAndRank(allCandidates, profile);

        return {
            forYou: scoredMovies,
            basedOnGenres: removeDuplicates(genreBased).slice(0, 20),
            similar: removeDuplicates(similarBased).slice(0, 20),
            deepCuts: removeDuplicates(deepCuts).slice(0, 15)
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

                // HEAVY WEIGHT: Ratings define the "ADN"
                // 10 stars = 15 points, 1 star = 1 point, Unrated = 5 points
                const weight = rating > 0 ? (rating > 7 ? rating * 1.5 : rating) : 5;
                genreScores[genre.id].score += weight;
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

        if (movie.popularity && movie.popularity < 30) {
            obscureCount++;
        }
    });

    const topGenres = Object.values(genreScores)
        .map(g => ({
            ...g,
            avgRatingContribution: g.score / g.count,
            percentage: Math.round((g.count / watchedWithDetails.length) * 100)
        }))
        .sort((a, b) => b.avgRatingContribution - a.avgRatingContribution || b.count - a.count);

    const topDecades = Object.entries(decades)
        .map(([decade, weight]) => ({ decade: parseInt(decade), weight }))
        .sort((a, b) => b.weight - a.weight);

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
        // Focus on the top 3 genres with highest rating contribution
        const topGenres = profile.topGenres.slice(0, 3);
        const genrePromises = topGenres.map(g =>
            discoverMovies({
                with_genres: g.id,
                sort_by: 'vote_average.desc',
                'vote_count.gte': profile.prefersPopular ? 1500 : 200,
                'vote_average.gte': Math.max(profile.avgRating - 0.5, 7.0),
                'primary_release_date.gte': profile.topDecades.length > 0 ? `${profile.topDecades[0].decade - 10}-01-01` : '1900-01-01'
            }).catch(() => [])
        );

        const results = await Promise.all(genrePromises);
        const combined = results.flat();

        return filterWatched(combined, watched, watchlist);
    } catch (error) {
        console.error('[Tu ADN] Error in genre-based:', error);
        return [];
    }
}

async function getSimilarBasedRecommendations(watchedWithDetails, watched, watchlist) {
    // Seed HEAVILY from what the user LOVED (9-10 stars)
    const lovedMovies = watchedWithDetails
        .filter(m => (m.userRating || 0) >= 9)
        .sort((a, b) => (b.userRating || 0) - (a.userRating || 0))
        .slice(0, 8);

    // Fallback to 8 stars if not enough 9-10
    const likedMovies = watchedWithDetails
        .filter(m => (m.userRating || 0) === 8)
        .slice(0, 4);

    const seeds = [...lovedMovies, ...likedMovies];

    if (seeds.length === 0) return [];

    try {
        const similarPromises = seeds.map(movie =>
            getSimilarMovies(movie.id).catch(() => [])
        );

        const similarResults = await Promise.all(similarPromises);
        const allSimilar = similarResults.flat();

        return filterWatched(allSimilar, watched, watchlist);
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
            'vote_count.gte': 80,
            'vote_count.lte': 1000,
            'vote_average.gte': 7.4
        });

        return filterWatched(movies, watched, watchlist);
    } catch (error) {
        console.error('[Tu ADN] Error in deep cuts:', error);
        return [];
    }
}

function scoreAndRank(movies, profile) {
    const topGenreIds = profile.topGenres.slice(0, 5).map(g => g.id);
    const favoriteDecades = profile.topDecades.slice(0, 3).map(d => d.decade);

    const scored = movies.map(movie => {
        let score = 0;

        if (movie.genre_ids) {
            const matches = movie.genre_ids.filter(id => topGenreIds.includes(id));
            if (matches.length > 0) {
                // Exponential bonus for matching multiple favorite genres
                score += Math.pow(matches.length, 2) * 5;

                // Extra bonus for matching the #1 genre
                if (matches.includes(topGenreIds[0])) score += 15;
            }
        }

        if (movie.vote_average) {
            // Quality is important, but how close it is to user's average rating is better
            const diff = Math.abs(movie.vote_average - profile.avgRating);
            if (diff < 0.5) score += 20;
            else if (diff < 1.0) score += 10;

            // Absolute high quality bonus
            if (movie.vote_average > 8.2) score += 10;
        }

        if (movie.release_date) {
            const year = new Date(movie.release_date).getFullYear();
            const decade = Math.floor(year / 10) * 10;
            if (favoriteDecades.includes(decade)) {
                score += favoriteDecades[0] === decade ? 15 : 7;
            }
        }

        // Popularity alignment
        if (profile.prefersPopular && movie.vote_count > 2000) score += 5;
        if (profile.obscureRatio > 0.2 && movie.vote_count < 500) score += 12;

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
