import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createTmdbService, normalizeMovie, normalizeProviders, normalizeProviderList,
    getPosterUrl, DEFAULT_OVERVIEW
} from '../src/services/tmdb.js';
import { toStoredMovie } from '../src/api/tmdb.js';

const provider = (id, name = 'Provider') => ({ provider_id: id, provider_name: name, logo_path: '/logo.png' });
const rawMovie = (id = 1) => ({ id, title: 'Película', overview: 'Sinopsis', release_date: '2020-01-01', genre_ids: [18], vote_average: 8 });
const availability = { results: { AR: { flatrate: [provider(8)], rent: [provider(2)], buy: [provider(2)], link: 'https://www.themoviedb.org/movie/1/watch?locale=AR' } } };
function setup(handler, options = {}) {
    const calls = [], warnings = [];
    const api = createTmdbService({ apiKey: 'test-key', logger: { warn: message => warnings.push(message) },
        transport: { get: async (path, { params }) => { calls.push({ path, params }); return { data: await handler(path, params) }; } }, ...options });
    return { api, calls, warnings };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('movie payload has exactly nine public fields, clean genres and useful fallbacks', () => {
    const movie = normalizeMovie({ id: 1, title: ' ', budget: 900, imdb_id: 'private-extra', poster_path: 'https://bad.example/image', genre_ids: [18], vote_average: null });
    assert.deepEqual(Object.keys(movie), ['id', 'title', 'overview', 'posterPath', 'backdropPath', 'releaseDate', 'voteAverage', 'genres', 'providers']);
    assert.equal(movie.overview, DEFAULT_OVERVIEW);
    assert.equal(movie.title, 'Película sin título');
    assert.equal(movie.posterPath, null);
    assert.equal(getPosterUrl(movie.posterPath), '/logo.png');
    assert.deepEqual(movie.genres, [{ id: 18, name: 'Drama' }]);
    assert.equal(movie.providers.status, 'unknown');
});

test('Argentina availability never falls back to another country', () => {
    const result = normalizeProviders({ results: { US: { flatrate: [provider(8)] } } });
    assert.equal(result.region, 'AR');
    assert.equal(result.status, 'unavailable');
    assert.deepEqual(result.flatrate, []);
    assert.equal(result.link, null);
    const ar = normalizeProviders(availability);
    assert.deepEqual([ar.flatrate[0].id, ar.rent[0].id, ar.buy[0].id], [8, 2, 2]);
});

test('platform aliases merge while Apple TV Store and subscription remain distinct', () => {
    const result = normalizeProviderList([provider(384), provider(1899), provider(350), provider(2), provider(119), provider(337), provider(531), provider(8)]);
    assert.equal(result.length, 7);
    assert.deepEqual(result.find(p => p.id === 1899).tmdbIds, [384, 1899]);
    assert.equal(result.find(p => p.id === 350).name, 'Apple TV+');
    assert.equal(result.find(p => p.id === 119).name, 'Prime Video');
    assert.equal(result.find(p => p.id === 337).name, 'Disney+');
    assert.equal(result.find(p => p.id === 531).name, 'Paramount+');
    assert.equal(result.find(p => p.id === 8).logoUrl, 'https://image.tmdb.org/t/p/w92/logo.png');
});

test('detail, metadata, videos and availability share one in-flight detail request', async () => {
    const { api, calls } = setup(async () => {
        await tick();
        return { ...rawMovie(), runtime: 120, budget: 900, credits: { cast: [{ id: 3, name: 'Actor', character: 'Role' }] },
            videos: { results: [{ id: 'v', site: 'YouTube', type: 'Trailer', key: 'abc' }] }, 'watch/providers': availability };
    });
    const [movie, metadata, videos, providers] = await Promise.all([
        api.getMovieDetails(1), api.getMovieMetadata(1), api.getMovieVideos(1), api.getWatchProviders(1)
    ]);
    assert.equal(calls.length, 1);
    assert.equal(metadata.runtime, 120);
    assert.equal(metadata.cast[0].name, 'Actor');
    assert.equal(videos[0].key, 'abc');
    assert.equal(providers.flatrate[0].id, 8);
    movie.title = 'Locally edited'; movie.genres[0].name = 'Wrong'; providers.flatrate.length = 0;
    const again = await api.getMovieDetails('1');
    assert.equal(again.title, 'Película');
    assert.equal(again.genres[0].name, 'Drama');
    assert.equal((await api.getWatchProviders(1)).flatrate.length, 1);
    assert.equal(calls.length, 1);
});

test('an empty regional provider result is cached for the session', async () => {
    const { api, calls } = setup(() => ({ results: { US: { flatrate: [provider(8)] } } }));
    const results = await Promise.all([api.getWatchProviders(4), api.getWatchProviders(4)]);
    assert.equal(results[0].status, 'unavailable');
    await api.getWatchProviders(4);
    assert.equal(calls.length, 1);
});

test('list cache keys ignore parameter ordering but separate pages and languages', async () => {
    const { api, calls } = setup(() => ({ results: [rawMovie()] }));
    await Promise.all([
        api.discoverMovies({ page: 1, with_genres: 18 }),
        api.discoverMovies({ with_genres: '18', page: '1' })
    ]);
    assert.equal(calls.length, 1);
    await api.discoverMovies({ with_genres: 18, page: 2 });
    api.setApiLanguage('en-US');
    await api.discoverMovies({ page: 1, with_genres: 18 });
    api.setApiLanguage('es-AR');
    await api.discoverMovies({ with_genres: 18, page: 1 });
    assert.equal(calls.length, 3);
});

test('discover filters use Argentina, subscription and actual catalog IDs', async () => {
    const { api, calls } = setup(path => path === '/watch/providers/movie'
        ? { results: [provider(384)] } : { results: [rawMovie()] });
    await api.discoverMovies({ with_watch_providers: '1899', watch_region: 'US' });
    const params = calls.find(c => c.path === '/discover/movie').params;
    assert.equal(params.watch_region, 'AR');
    assert.equal(params.with_watch_monetization_types, 'flatrate');
    assert.equal(params.with_watch_providers, '384');
    await api.getStreamingPlatforms();
    assert.equal(calls.filter(c => c.path === '/watch/providers/movie').length, 1);
});

test('failed requests are retriable and logs never contain Axios credentials', async () => {
    let attempts = 0;
    const { api, calls, warnings } = setup(() => {
        if (++attempts === 1) throw { response: { status: 429 }, config: { headers: { Authorization: 'secret-bearer' }, params: { api_key: 'secret-key' } } };
        return { results: [rawMovie()] };
    });
    assert.deepEqual(await api.searchMovies('movie'), []);
    assert.equal((await api.searchMovies('movie')).length, 1);
    assert.equal(calls.length, 2);
    assert.match(warnings[0], /429/);
    assert.doesNotMatch(warnings.join(' '), /secret/);
});

test('missing credentials warn and prevent HTTP calls', async () => {
    const { api, calls, warnings } = setup(() => assert.fail('HTTP should not run'), { apiKey: undefined });
    assert.deepEqual(await api.getTrendingMovies(), []);
    assert.equal(calls.length, 0);
    assert.match(warnings[0], /VITE_TMDB_API_KEY/);
});

test('the queue limits concurrency and snapshots the language before waiting', async () => {
    const releases = [];
    let active = 0, peak = 0;
    const { api, calls } = setup(async () => {
        peak = Math.max(peak, ++active);
        await new Promise(resolve => releases.push(resolve));
        active--;
        return { results: [rawMovie()] };
    }, { maxConcurrent: 2 });
    const requests = [1, 2, 3, 4].map(page => api.getTrendingMovies(page));
    const duplicate = api.getTrendingMovies(4);
    api.setApiLanguage('en-US');
    await tick();
    assert.equal(calls.length, 2);
    for (let i = 0; i < 4; i++) { releases[i](); await tick(); }
    await Promise.all([...requests, duplicate]);
    assert.equal(peak, 2);
    assert.equal(calls.length, 4);
    assert.ok(calls.every(c => c.params.language === 'es-AR'));
});

test('search is paginated, trims whitespace and keeps year filters', async () => {
    const { api, calls } = setup(() => ({ results: [rawMovie()] }));
    await api.searchMovies('  Wings  ', 2, { year: 1927 });
    await api.searchMovies('Wings', 2, { year: 1927 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].params.page, 2);
    assert.equal(calls[0].params.year, 1927);
});

test('library platform filtering processes more than 200 films and reuses cached providers', async () => {
    const { api, calls } = setup(() => availability);
    const movies = Array.from({ length: 205 }, (_, index) => normalizeMovie(rawMovie(index + 1)));
    assert.equal((await api.filterMoviesByProviders(movies, [8])).length, 205);
    assert.equal((await api.filterMoviesByProviders(movies, [2])).length, 0, 'rental must not count as subscription');
    assert.equal(calls.length, 205);
    assert.deepEqual(await api.filterMoviesByProviders(movies, [8], { isCancelled: () => true }), []);
    assert.equal(calls.length, 205);
});

test('videos fall back to English and only expose usable YouTube trailers or teasers', async () => {
    const { api, calls } = setup((path, params) => ({ results: params.language === 'en-US'
        ? [{ id: 'ok', site: 'YouTube', type: 'Trailer', key: 'valid_key' }, { site: 'Other', type: 'Trailer', key: 'bad' }]
        : [{ site: 'YouTube', type: 'Trailer', key: 'javascript:bad' }] }));
    assert.equal((await api.getMovieVideos(1))[0].key, 'valid_key');
    await api.getMovieVideos(1);
    assert.equal(calls.length, 2);
});

test('API key and Bearer authentication are central and cannot be overridden by filters', async () => {
    const configs = [];
    const adapter = async config => { configs.push(config); return { data: { results: [] }, status: 200, statusText: 'OK', headers: {}, config }; };
    const keyed = createTmdbService({ apiKey: 'configured-key', adapter });
    await keyed.discoverMovies({ api_key: 'injected-key' });
    assert.equal(configs[0].params.api_key, 'configured-key');
    const token = createTmdbService({ apiKey: 'unused', accessToken: 'configured-token', adapter });
    await token.getTrendingMovies();
    assert.equal(configs[1].headers.Authorization, 'Bearer configured-token');
    assert.equal(configs[1].params.api_key, undefined);
    assert.equal(configs[1].baseURL, 'https://api.themoviedb.org/3');
});

test('malformed responses are not cached as empty availability or movie lists', async () => {
    let attempts = 0;
    const { api, calls } = setup(() => ++attempts === 1 ? { success: false } : availability);
    assert.equal((await api.getWatchProviders(1)).status, 'error');
    assert.equal((await api.getWatchProviders(1)).status, 'available');
    assert.equal(calls.length, 2);
});

test('the persistence adapter preserves legacy movie fields without storing API extras', () => {
    const normalized = normalizeMovie({ ...rawMovie(), poster_path: '/poster.jpg', backdrop_path: '/backdrop.jpg' });
    const stored = toStoredMovie(normalized);
    assert.equal(stored.poster_path, '/poster.jpg');
    assert.equal(stored.release_date, '2020-01-01');
    assert.equal(stored.vote_average, 8);
    assert.deepEqual(stored.genre_ids, [18]);
    assert.equal(stored.providers, undefined);
    assert.deepEqual(normalizeMovie(stored), normalized);
});

test('availability cache is shared across languages and enriches later movie details', async () => {
    const { api, calls } = setup(path => path.endsWith('/watch/providers') ? availability : rawMovie());
    await api.getWatchProviders(1);
    api.setApiLanguage('en-US');
    assert.equal((await api.getWatchProviders(1)).flatrate[0].id, 8);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].params.language, undefined, 'the regional endpoint is not translated');
    assert.equal((await api.getMovieDetails(1)).providers.flatrate[0].id, 8);
    assert.equal(calls.length, 2);
});

test('a language switch during a provider request does not create another HTTP call', async () => {
    const { api, calls } = setup(async () => { await tick(); return availability; });
    const first = api.getWatchProviders(1);
    api.setApiLanguage('en-US');
    const second = api.getWatchProviders(1);
    assert.deepEqual(await first, await second);
    assert.equal(calls.length, 1);
});

test('appended detail providers prime the regional cache for every language', async () => {
    const { api, calls } = setup(() => ({ ...rawMovie(), 'watch/providers': availability }));
    await api.getMovieDetails(1);
    api.setApiLanguage('en-US');
    const providers = await api.getWatchProviders(1);
    assert.equal(providers.region, 'AR');
    assert.equal(providers.status, 'available');
    assert.equal(calls.length, 1);
});

test('provider aliases preserve AND combinations instead of widening the filter', async () => {
    const { api, calls } = setup(path => path === '/watch/providers/movie'
        ? { results: [provider(384), provider(1899), provider(8)] } : { results: [] });
    await api.discoverMovies({ with_watch_providers: '1899,8' });
    assert.equal(calls.find(c => c.path === '/discover/movie').params.with_watch_providers, '8,1899|8,384');
    await api.discoverMovies({ with_watch_providers: '8,1899' });
    assert.equal(calls.filter(c => c.path === '/discover/movie').length, 1);
});

test('rental and purchase discover queries retain their monetization type in Argentina', async () => {
    const { api, calls } = setup(() => ({ results: [] }));
    await api.discoverMovies({ with_watch_monetization_types: 'rent|buy', watch_region: 'US' });
    assert.equal(calls[0].params.watch_region, 'AR');
    assert.equal(calls[0].params.with_watch_monetization_types, 'rent|buy');
});

test('malformed catalog responses remain retriable', async () => {
    let attempts = 0;
    const { api, calls } = setup(() => ++attempts === 1 ? {} : { results: [provider(8)] });
    assert.deepEqual(await api.getStreamingPlatforms(), []);
    assert.equal((await api.getStreamingPlatforms())[0].id, 8);
    assert.equal(calls.length, 2);
});

test('malformed entries cannot break an otherwise valid list or provider payload', async () => {
    assert.equal(normalizeMovie(null).overview, DEFAULT_OVERVIEW);
    assert.equal(normalizeMovie(null).id, null);
    assert.deepEqual(normalizeMovie({ id: 1, genres: [null, { id: 18 }, { id: 18 }, { id: -1 }] }).genres,
        [{ id: 18, name: 'Drama' }]);
    assert.equal(normalizeProviderList([null, false, provider(8), { id: -1 }]).length, 1);
    const { api } = setup(() => ({ results: [null, false, rawMovie()] }));
    assert.equal((await api.getTrendingMovies()).length, 1);
});

test('genre discovery carries both filters and the requested page', async () => {
    const { api, calls } = setup(() => ({ results: [] }));
    await api.getMoviesByGenre(28, {}, 2);
    await api.getMoviesByGenre(27, { 'vote_average.gte': 7 }, 3);
    assert.equal(calls[0].params.page, 2);
    assert.equal(calls[0].params.with_genres, 28);
    assert.equal(calls[1].params.page, 3);
    assert.equal(calls[1].params['vote_average.gte'], 7);
});

test('a failed queued request frees its slot and does not cache the fallback', async () => {
    let attempts = 0;
    const { api, calls } = setup(() => {
        if (++attempts === 1) throw new Error('Temporary failure');
        return { results: [rawMovie()] };
    }, { maxConcurrent: 1 });
    const [failed, success] = await Promise.all([api.getTrendingMovies(1), api.getTrendingMovies(2)]);
    assert.deepEqual(failed, []);
    assert.equal(success.length, 1);
    assert.equal((await api.getTrendingMovies(1)).length, 1);
    assert.equal(calls.length, 3);
});
