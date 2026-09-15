import fs from 'fs';
import path from 'path';
import { loadEnv } from 'vite';
import { createTmdbServiceFromEnv } from '../src/services/tmdb.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmdb = createTmdbServiceFromEnv(loadEnv('development', process.cwd(), 'VITE_'));
tmdb.setApiLanguage('en-US');
const FILE_PATH = path.join(__dirname, '../src/constants/oscarWinners.js');

async function searchMovie(title, year) {
    try {
        const [found] = await tmdb.searchMovies(title, 1, { year });
        return found || null;
    } catch (e) {
        console.error(`Search error for ${title}: ${e.message}`);
    }
    return null;
}

async function verifyAndFix() {
    console.log('🛠️  Verifying and FIXING IDs...');
    const content = fs.readFileSync(FILE_PATH, 'utf-8');
    const regex = /(\d+),\s*\/\/\s*(.+)/g;

    let match;
    const moviesToCheck = [];

    while ((match = regex.exec(content)) !== null) {
        // Extract Year from comment if possible: "Movie Title (1999)"
        const comment = match[2].trim();
        const yearMatch = comment.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : null;
        const cleanTitle = comment.replace(/\s*\(\d{4}\).*/, '').split(' - ')[0].trim();

        moviesToCheck.push({
            currentId: match[1],
            fullComment: comment,
            cleanTitle: cleanTitle,
            year: year
        });
    }

    const correctedLines = [];

    for (const movie of moviesToCheck) {
        let correctId = movie.currentId;
        let note = '';

        try {
            // Check current ID
            const data = await tmdb.getMovieDetails(movie.currentId);
            if (!data) throw new Error('No movie details available');
            const apiTitle = data.title.toLowerCase();
            const expectedTitleLower = movie.cleanTitle.toLowerCase();

            // Check if match
            if (!apiTitle.includes(expectedTitleLower) && !expectedTitleLower.includes(apiTitle)) {
                console.log(`❌ Mismatch for "${movie.cleanTitle}" (ID: ${movie.currentId} -> ${data.title})`);
                const found = await searchMovie(movie.cleanTitle, movie.year);
                if (found) {
                    console.log(`   ✅ Found correct ID: ${found.id} (${found.title} - ${found.releaseDate})`);
                    correctId = found.id;
                } else {
                    console.log(`   ⚠️  Could not find correct ID for "${movie.cleanTitle}"`);
                    note = ' // ⚠️ CHECK ID';
                }
            } else {
                process.stdout.write('.');
            }
        } catch (error) {
            console.log(`❌ Error/404 for "${movie.cleanTitle}" (ID: ${movie.currentId})`);
            const found = await searchMovie(movie.cleanTitle, movie.year);
            if (found) {
                console.log(`   ✅ Found correct ID: ${found.id} (${found.title} - ${found.releaseDate})`);
                correctId = found.id;
            } else {
                console.log(`   ⚠️  Could not find correct ID for "${movie.cleanTitle}"`);
                note = ' // ⚠️ CHECK ID';
            }
        }

        correctedLines.push(`    ${correctId},   // ${movie.fullComment}${note}`);
        await new Promise(r => setTimeout(r, 150));
    }

    console.log('\n\n📝 Generated Corrected List:');
    console.log(correctedLines.join('\n'));

    // Write to a new file to inspect
    fs.writeFileSync(path.join(__dirname, 'corrected_ids.txt'), correctedLines.join('\n'));
}

verifyAndFix();
