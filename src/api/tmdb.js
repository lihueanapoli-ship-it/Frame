// Compatibility for saved movie records and existing recommendation algorithms.
// All HTTP, normalization, credentials and request caching live in the service.
import * as tmdb from '../services/tmdb.js';

export function toStoredMovie(value) {
    const movie = tmdb.normalizeMovie(value);
    return {
        id: movie.id, title: movie.title, overview: movie.overview,
        poster_path: movie.posterPath, backdrop_path: movie.backdropPath,
        release_date: movie.releaseDate, vote_average: movie.voteAverage,
        genres: movie.genres, genre_ids: movie.genres.map(g => g.id)
    };
}

export async function getMovieDetails(id) {
    const [movie, metadata] = await Promise.all([tmdb.getMovieDetails(id), tmdb.getMovieMetadata(id)]);
    if (!movie) return null;
    return {
        ...toStoredMovie(movie), runtime: metadata?.runtime || 0,
        production_countries: (metadata?.productionCountries || []).map(c => ({ iso_3166_1: c.code, name: c.name })),
        origin_country: metadata?.originCountries || [], popularity: metadata?.popularity || 0
    };
}

const legacyList = method => async (...args) => (await method(...args)).map(toStoredMovie);
export const discoverMovies = legacyList(tmdb.discoverMovies);
export const getMoviesByGenre = legacyList(tmdb.getMoviesByGenre);
export const getSimilarMovies = legacyList(tmdb.getSimilarMovies);
export const getTrendingMovies = legacyList(tmdb.getTrendingMovies);
