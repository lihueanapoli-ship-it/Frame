import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = 'dc99676fa7a2c875f922675a6a46aa59';
const FILE_PATH = path.join(__dirname, '../src/constants/oscarWinners.js');

async function searchMovie(title, year) {
    try {
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
        const response = await axios.get(url);
        if (response.data.results && response.data.results.length > 0) {
            return response.data.results[0]; // Assume first result is best
        }
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
            const response = await axios.get(`https://api.themoviedb.org/3/movie/${movie.currentId}?api_key=${API_KEY}`);
            const data = response.data;
            const apiTitle = data.title.toLowerCase();
            const expectedTitleLower = movie.cleanTitle.toLowerCase();

            // Check if match
            if (!apiTitle.includes(expectedTitleLower) && !expectedTitleLower.includes(apiTitle)) {
                console.log(`❌ Mismatch for "${movie.cleanTitle}" (ID: ${movie.currentId} -> ${data.title})`);
                const found = await searchMovie(movie.cleanTitle, movie.year);
                if (found) {
                    console.log(`   ✅ Found correct ID: ${found.id} (${found.title} - ${found.release_date})`);
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
                console.log(`   ✅ Found correct ID: ${found.id} (${found.title} - ${found.release_date})`);
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
