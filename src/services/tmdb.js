import axios from 'axios';

export const WATCH_REGION = 'AR';
export const DEFAULT_OVERVIEW = 'Sin sinopsis disponible.';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';
const PLACEHOLDER = '/logo.png';
const DETAIL_PARAMS = { append_to_response: 'credits,videos,watch/providers' };
const PROVIDERS = [
    { id: 8, name: 'Netflix', aliases: [8] },
    { id: 1899, name: 'Max', aliases: [1899, 384] },
    { id: 337, name: 'Disney+', aliases: [337] },
    { id: 119, name: 'Prime Video', aliases: [119] },
    { id: 531, name: 'Paramount+', aliases: [531] },
    { id: 350, name: 'Apple TV+', aliases: [350] }
];
const GENRES = {
    28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia', 80: 'Crimen',
    99: 'Documental', 18: 'Drama', 10751: 'Familia', 14: 'Fantasía', 36: 'Historia',
    27: 'Terror', 10402: 'Música', 9648: 'Misterio', 10749: 'Romance',
    878: 'Ciencia ficción', 10770: 'Película de TV', 53: 'Suspense', 10752: 'Bélica', 37: 'Western'
};
const array = value => Array.isArray(value) ? value : [];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const records = value => array(value).filter(isRecord);
const cleanText = value => typeof value === 'string' ? value.trim() : '';
const imagePath = value => /^\/[\w./-]+$/.test(value || '') ? value : null;
const clone = value => JSON.parse(JSON.stringify(value));
const today = () => new Date().toISOString().slice(0, 10);
const numericId = value => {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid TMDB ID');
    return id;
};

export const getPosterUrl = (path, size = 'w500') => imagePath(path) ? `${IMAGE_BASE}/${size}${path}` : PLACEHOLDER;
export const getBackdropUrl = (path, size = 'w1280') => getPosterUrl(path, size);
export const getGenreNames = ids => array(ids).map(id => GENRES[id]).filter(Boolean);

export function normalizeProviderList(rawProviders) {
    const providers = new Map();
    for (const raw of records(rawProviders)) {
        const tmdbId = Number(raw.provider_id ?? raw.id);
        if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) continue;
        const known = PROVIDERS.find(p => p.aliases.includes(tmdbId));
        const id = known?.id ?? tmdbId;
        const logoPath = imagePath(raw.logo_path ?? raw.logoPath);
        const existing = providers.get(id);
        const validIds = array(raw.tmdbIds).map(Number).filter(id => Number.isSafeInteger(id) && id > 0);
        const tmdbIds = validIds.length ? [...new Set(validIds)] : [tmdbId];
        if (existing) {
            existing.tmdbIds = [...new Set([...existing.tmdbIds, ...tmdbIds])];
            if (!existing.logoPath || tmdbId === id) {
                existing.logoPath = logoPath || existing.logoPath;
                existing.logoUrl = getPosterUrl(existing.logoPath, 'w92');
            }
        } else {
            providers.set(id, {
                id, tmdbIds, name: known?.name || cleanText(raw.provider_name ?? raw.name) || 'Plataforma',
                logoPath, logoUrl: getPosterUrl(logoPath, 'w92')
            });
        }
    }
    return [...providers.values()];
}

export function normalizeProviders(payload, region = WATCH_REGION) {
    // This endpoint returns all countries; absence of AR must never fall back to US.
    const loaded = isRecord(payload?.results);
    const data = payload?.results?.[region];
    const flatrate = normalizeProviderList(data?.flatrate);
    const rent = normalizeProviderList(data?.rent);
    const buy = normalizeProviderList(data?.buy);
    const link = /^https:\/\/(www\.)?themoviedb\.org\//.test(data?.link || '') ? data.link : null;
    return {
        region, flatrate, rent, buy, link,
        status: !loaded ? 'unknown' : flatrate.length + rent.length + buy.length ? 'available' : 'unavailable'
    };
}

export function normalizeMovie(raw = {}) {
    raw = isRecord(raw) ? raw : {};
    const genres = records(raw.genres).length ? records(raw.genres) : array(raw.genre_ids).map(id => ({ id, name: GENRES[id] }));
    const vote = Number(raw.voteAverage ?? raw.vote_average);
    return {
        id: Number.isSafeInteger(Number(raw.id)) && Number(raw.id) > 0 ? Number(raw.id) : null,
        title: cleanText(raw.title) || cleanText(raw.original_title) || 'Película sin título',
        overview: cleanText(raw.overview) || DEFAULT_OVERVIEW,
        posterPath: imagePath(raw.posterPath ?? raw.poster_path),
        backdropPath: imagePath(raw.backdropPath ?? raw.backdrop_path),
        releaseDate: cleanText(raw.releaseDate ?? raw.release_date) || null,
        voteAverage: Number.isFinite(vote) ? Math.max(0, Math.min(10, vote)) : 0,
        genres: [...new Map(genres.filter(g => Number.isSafeInteger(Number(g.id)) && Number(g.id) > 0)
            .map(g => [Number(g.id), { id: Number(g.id), name: cleanText(g.name) || GENRES[g.id] || 'Otro' }])).values()],
        providers: raw.providers?.region === WATCH_REGION ? {
            ...normalizeProviders(null),
            region: WATCH_REGION,
            status: raw.providers.status || 'unknown',
            flatrate: normalizeProviderList(raw.providers.flatrate),
            rent: normalizeProviderList(raw.providers.rent),
            buy: normalizeProviderList(raw.providers.buy),
            link: /^https:\/\/(www\.)?themoviedb\.org\//.test(raw.providers.link || '') ? raw.providers.link : null
        } : normalizeProviders(raw['watch/providers'])
    };
}

function normalizeMetadata(raw) {
    return {
        runtime: Number(raw.runtime) || 0,
        productionCountries: records(raw.production_countries).map(c => ({ code: c.iso_3166_1, name: c.name })),
        originCountries: array(raw.origin_country),
        popularity: Number(raw.popularity) || 0,
        cast: records(raw.credits?.cast).slice(0, 10).map(c => ({
            id: c.id, name: c.name, character: c.character || '', profilePath: imagePath(c.profile_path)
        }))
    };
}

const normalizeVideos = data => records(data?.results)
    .filter(v => v.site === 'YouTube' && ['Trailer', 'Teaser'].includes(v.type) && /^[\w-]+$/.test(v.key || ''))
    .map(v => ({ id: v.id, key: v.key, type: v.type, site: v.site }));
const normalizeMovies = values => records(values)
    .filter(m => Number.isSafeInteger(Number(m.id)) && Number(m.id) > 0)
    .map(normalizeMovie).filter(m => !m.releaseDate || m.releaseDate <= today());

function normalizeMovieResponse(data) {
    const values = data?.results ?? data?.items;
    if (!Array.isArray(values)) throw new Error('Invalid TMDB list response');
    return normalizeMovies(values);
}

export function createTmdbService({ apiKey, accessToken, transport, adapter, logger = console, maxConcurrent = 6 } = {}) {
    apiKey = cleanText(apiKey);
    accessToken = cleanText(accessToken);
    const client = transport || axios.create({
        baseURL: 'https://api.themoviedb.org/3', timeout: 12000, adapter,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        params: accessToken ? {} : { api_key: apiKey }
    });
    if (!apiKey && !accessToken) logger.warn('[TMDB] Falta VITE_TMDB_API_KEY o VITE_TMDB_ACCESS_TOKEN.');
    let language = 'es-AR';
    const cache = new Map();
    const inFlight = new Map();
    const queue = [];
    let active = 0;
    const concurrency = Number.isFinite(maxConcurrent) ? Math.max(1, Math.floor(maxConcurrent)) : 6;
    const keyFor = (path, params) => JSON.stringify([path, Object.entries(params)
        .map(([key, value]) => [key, String(value)]).sort(([a], [b]) => a.localeCompare(b))]);

    async function http(path, params) {
        if (active >= concurrency) await new Promise(resolve => queue.push(resolve));
        else active++;
        try {
            return await client.get(path, { params });
        } finally {
            const next = queue.shift();
            if (next) next(); // Transfer this slot without exceeding the limit.
            else active--;
        }
    }

    async function request(path, params, normalize, locale = language) {
        if (!apiKey && !accessToken) throw new Error('Missing TMDB credentials');
        const parameters = Object.fromEntries(Object.entries({ language: locale, ...params })
            .filter(([, value]) => value !== undefined && value !== null && value !== ''));
        // Callers cannot override centrally configured credentials.
        delete parameters.api_key;
        const key = keyFor(path, parameters);
        if (cache.has(key)) return clone(cache.get(key));
        if (!inFlight.has(key)) {
            const pending = http(path, parameters).then(({ data }) => {
                if (data?.success === false) throw new Error('TMDB rejected the request');
                const result = normalize(data);
                cache.set(key, result);
                return result;
            }).finally(() => inFlight.delete(key));
            inFlight.set(key, pending);
        }
        return clone(await inFlight.get(key));
    }

    async function safely(action, fallback) {
        try { return await action(); }
        catch (error) {
            // Axios errors include request credentials; never log the full object.
            logger.warn(`[TMDB] No se pudo completar la consulta (${error.response?.status || error.code || 'error'}).`);
            return clone(fallback);
        }
    }

    // Availability is regional, not translated. Both endpoints share this cache
    // entry so changing UI language never triggers another provider lookup.
    const providerPath = id => `/movie/${numericId(id)}/watch/providers`;
    const cachedProviders = id => cache.get(keyFor(providerPath(id), {}));
    const loadDetail = (id, locale = language) => request(`/movie/${numericId(id)}`, DETAIL_PARAMS, raw => {
        if (Number(raw?.id) !== Number(id)) throw new Error('Invalid TMDB response');
        const movie = normalizeMovie(raw);
        if (movie.providers.status !== 'unknown') {
            cache.set(keyFor(providerPath(id), {}), movie.providers);
        } else if (cachedProviders(id)) {
            movie.providers = cachedProviders(id);
        }
        return { movie, metadata: normalizeMetadata(raw), videos: normalizeVideos(raw.videos) };
    }, locale);

    const pendingDetail = (id, locale) => {
        const key = keyFor(`/movie/${numericId(id)}`, { language: locale, ...DETAIL_PARAMS });
        return cache.has(key) || inFlight.has(key) ? loadDetail(id, locale) : null;
    };
    const list = (path, params = {}) => safely(() => request(path, params, normalizeMovieResponse), []);
    const getAvailableProvidersInRegion = () => safely(() => request('/watch/providers/movie', { watch_region: WATCH_REGION }, data => {
        if (!Array.isArray(data?.results)) throw new Error('Invalid TMDB provider catalog');
        return normalizeProviderList(data.results);
    }), []);

    const getWatchProviders = id => safely(async () => {
        if (cachedProviders(id)) return clone(cachedProviders(id));
        const locale = language;
        const details = pendingDetail(id, locale);
        if (details) {
            const providers = (await details).movie.providers;
            if (providers.status !== 'unknown') return providers;
        }
        return request(providerPath(id), {}, data => {
            const providers = normalizeProviders(data);
            if (providers.status === 'unknown') throw new Error('Invalid TMDB provider response');
            return providers;
        }, null);
    }, { ...normalizeProviders(null), status: 'error' });

    const getMovieVideos = id => safely(async () => {
        const locale = language;
        const details = pendingDetail(id, locale);
        const videos = details ? (await details).videos : await request(`/movie/${numericId(id)}/videos`, {}, normalizeVideos, locale);
        return videos.length || locale === 'en-US' ? videos : request(`/movie/${numericId(id)}/videos`, {}, normalizeVideos, 'en-US');
    }, []);

    const discoverMovies = (params = {}) => safely(async () => {
        const locale = language;
        const filters = { ...params, watch_region: WATCH_REGION, 'release_date.lte': today() };
        if (filters.with_watch_providers) {
            const catalog = await getAvailableProvidersInRegion();
            // Distribute aliases over AND groups: (Max AND Netflix) must never
            // turn into (old Max OR (new Max AND Netflix)).
            filters.with_watch_providers = [...new Set(String(filters.with_watch_providers).split('|').flatMap(group =>
                group.split(',').reduce((combinations, value) => {
                    const id = numericId(value);
                    const alternatives = catalog.find(p => p.id === id || p.tmdbIds.includes(id))?.tmdbIds || [id];
                    return combinations.flatMap(combination => alternatives.map(alias => [...combination, alias]));
                }, [[]]).map(combination => [...new Set(combination)].sort((a, b) => a - b).join(','))
            ))].sort().join('|');
            filters.with_watch_monetization_types ||= 'flatrate';
        }
        return request('/discover/movie', filters, normalizeMovieResponse, locale);
    }, []);

    async function filterMoviesByProviders(movies, providerIds, { isCancelled = () => false } = {}) {
        if (!providerIds.length) return movies;
        const result = [];
        for (let i = 0; i < movies.length && !isCancelled(); i += concurrency) {
            const batch = await Promise.all(movies.slice(i, i + concurrency).map(async movie => {
                const providers = await getWatchProviders(movie.id);
                return providers.flatrate.some(p => providerIds.includes(p.id)) ? movie : null;
            }));
            result.push(...batch.filter(Boolean));
        }
        return result;
    }

    return {
        setApiLanguage: locale => { language = cleanText(locale) || 'es-AR'; },
        getApiLanguage: () => language,
        searchMovies: (query, page = 1, filters = {}) => cleanText(query) ? list('/search/movie', { ...filters, query: cleanText(query), page }) : Promise.resolve([]),
        getMovieDetails: id => safely(async () => {
            const { movie } = await loadDetail(id);
            return { ...movie, providers: clone(cachedProviders(id) || movie.providers) };
        }, null),
        getMovieMetadata: id => safely(async () => (await loadDetail(id)).metadata, null),
        getMovieVideos, getWatchProviders, getAvailableProvidersInRegion,
        getStreamingPlatforms: async () => {
            const catalog = await getAvailableProvidersInRegion();
            return PROVIDERS.map(p => catalog.find(c => c.id === p.id)).filter(Boolean);
        },
        getTopRatedMovies: (page = 1) => list('/movie/top_rated', { page }),
        getTrendingMovies: (page = 1) => list('/trending/movie/week', { page }),
        getList: id => safely(() => list(`/list/${numericId(id)}`), []),
        getSimilarMovies: id => safely(() => list(`/movie/${numericId(id)}/similar`), []),
        getMoviesByGenre: (genreId, params = {}, page = 1) => discoverMovies({ with_genres: genreId, sort_by: 'popularity.desc', ...params, page }),
        getDirectorMovies: id => discoverMovies({ with_crew: id, sort_by: 'popularity.desc' }),
        discoverMovies, filterMoviesByProviders,
        getCountries: () => safely(() => request('/configuration/countries', {}, data => array(data).map(c => ({
            iso_3166_1: c.iso_3166_1, native_name: c.native_name, english_name: c.english_name
        }))), []),
        getCustomCollection: (type, page = 1) => {
            const collections = {
                must_watch: { 'vote_average.gte': 8.2, 'vote_count.gte': 10000, sort_by: 'vote_average.desc' },
                short: { 'with_runtime.lte': 90, 'vote_count.gte': 500 },
                conversation: { with_genres: '18', without_genres: '28,878,27', 'vote_average.gte': 7.5 },
                tech: { with_genres: '878' }, argentina: { region: WATCH_REGION, with_origin_country: WATCH_REGION },
                thriller: { with_genres: '53,9648' }, romance: { with_genres: '10749,35', 'vote_average.gte': 7 },
                real_life: { with_keywords: '9672' }, sagas: { with_genres: '12,14', sort_by: 'revenue.desc' },
                classic_author: { with_keywords: '2398|390|14750', sort_by: 'vote_average.desc', 'vote_count.gte': 200 }
            };
            return discoverMovies({ sort_by: 'popularity.desc', 'vote_count.gte': 100, ...collections[type], page });
        }
    };
}

export function createTmdbServiceFromEnv(env = {}) {
    return createTmdbService({
        apiKey: env.VITE_TMDB_API_KEY,
        accessToken: env.VITE_TMDB_ACCESS_TOKEN || env.VITE_TMDB_API_READ_ACCESS_TOKEN
    });
}

let singleton;
const service = () => singleton ||= createTmdbServiceFromEnv(import.meta.env || {});
export const setApiLanguage = (...args) => service().setApiLanguage(...args);
export const getApiLanguage = (...args) => service().getApiLanguage(...args);
export const searchMovies = (...args) => service().searchMovies(...args);
export const getMovieDetails = (...args) => service().getMovieDetails(...args);
export const getMovieMetadata = (...args) => service().getMovieMetadata(...args);
export const getMovieVideos = (...args) => service().getMovieVideos(...args);
export const getWatchProviders = (...args) => service().getWatchProviders(...args);
export const getAvailableProvidersInRegion = (...args) => service().getAvailableProvidersInRegion(...args);
export const getStreamingPlatforms = (...args) => service().getStreamingPlatforms(...args);
export const getTopRatedMovies = (...args) => service().getTopRatedMovies(...args);
export const getTrendingMovies = (...args) => service().getTrendingMovies(...args);
export const getList = (...args) => service().getList(...args);
export const getSimilarMovies = (...args) => service().getSimilarMovies(...args);
export const getMoviesByGenre = (...args) => service().getMoviesByGenre(...args);
export const getDirectorMovies = (...args) => service().getDirectorMovies(...args);
export const discoverMovies = (...args) => service().discoverMovies(...args);
export const filterMoviesByProviders = (...args) => service().filterMoviesByProviders(...args);
export const getCountries = (...args) => service().getCountries(...args);
export const getCustomCollection = (...args) => service().getCustomCollection(...args);
