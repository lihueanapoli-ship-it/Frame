import { loadEnv } from 'vite';
import { createTmdbServiceFromEnv } from '../src/services/tmdb.js';
const tmdb = createTmdbServiceFromEnv(loadEnv('development', process.cwd(), 'VITE_'));
tmdb.setApiLanguage('en-US');

async function findMissing() {
    const movies = ['The Life of Emile Zola', 'Wings'];
    for (const m of movies) {
        const [found] = await tmdb.searchMovies(m);
        if (!found) { console.log(`${m}: sin resultados`); continue; }
        console.log(`${m}: ${found.id} (${found.title} - ${found.releaseDate})`);
    }
}
findMissing();
