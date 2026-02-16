import axios from 'axios';
const API_KEY = 'dc99676fa7a2c875f922675a6a46aa59';

async function findMissing() {
    const movies = ['The Life of Emile Zola', 'Wings'];
    for (const m of movies) {
        const res = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${m}`);
        const found = res.data.results[0];
        console.log(`${m}: ${found.id} (${found.title} - ${found.release_date})`);
    }
}
findMissing();
