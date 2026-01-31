import React, { useState, useEffect, useCallback } from 'react';
import { getTrendingMovies, getMoviesByGenre, searchMovies } from '../api/tmdb';
import SearchBar from '../components/SearchBar';
import MovieCard from '../components/MovieCard';
import { Loader2 } from 'lucide-react';

const GENRES = [
    { id: 28, name: "Acción", emoji: "💥" },
    { id: 35, name: "Comedia", emoji: "🤣" },
    { id: 27, name: "Terror", emoji: "👻" },
    { id: 18, name: "Drama", emoji: "🎭" },
    { id: 878, name: "Ciencia Ficción", emoji: "🚀" },
    { id: 10749, name: "Romance", emoji: "💘" },
    { id: 53, name: "Thriller", emoji: "🔪" },
    { id: 16, name: "Animación", emoji: "🎨" },
    { id: 99, name: "Documental", emoji: "🌍" },
    { id: 10752, name: "Bélica", emoji: "⚔️" },
];

const SearchView = ({ onSelectMovie }) => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialMovies, setInitialMovies] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState(null);

    // Initial Load: Show some trending searches/movies
    useEffect(() => {
        const loadInitial = async () => {
            setLoading(true);
            const trending = await getTrendingMovies();
            setInitialMovies(trending.slice(0, 10)); // Top 10 trending
            setLoading(false);
        };
        loadInitial();
    }, []);

    const handleSearch = useCallback(async (query) => {
        if (!query) {
            // Logic Update: If the SearchBar clears (sends empty string),
            // we only want to clear results IF we are NOT currently viewing a Category.
            // However, selectedGenre is state.
            // The issue is: SearchBar sends onCallback('') on mount/update.
            // We'll ignore empty text updates if we have a genre selected.
            setResults((prev) => {
                // If we have results and a genre is selected, keep them!
                // Wait, we can't access state easily here without adding deps.
                // Let's rely on setState functional update or just check the ref logic.
                return prev;
            });
            // Actually, cleaner way:
            // If query is empty, just DO NOTHING.
            // Let the 'X' button in search bar or user action handle clearing explicitly if needed?
            // No, usually empty bar means show defaults.
            // Let's modify: Only set results to [] if NO GENRE is active.

            setSelectedGenre(prevGenre => {
                if (!prevGenre) setResults([]); // If no genre, clear results (back to trending)
                return prevGenre;
            });

            return;
        }

        setSelectedGenre(null); // If query exists (user typing), THEN clear genre
        setLoading(true);
        try {
            const data = await searchMovies(query);
            setResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleGenreClick = async (genreId) => {
        setSelectedGenre(genreId);
        setLoading(true);
        try {
            const data = await getMoviesByGenre(genreId);
            setResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Determine what to show
    const isSearchingOrFiltered = results.length > 0 || loading || selectedGenre;
    const moviesToShow = isSearchingOrFiltered ? results : initialMovies;

    return (
        <div className="p-4 pt-20 pb-24 min-h-screen max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Explorar</h1>

            <div className="mb-8">
                <SearchBar onSelectMovie={onSelectMovie} onSearchCallback={handleSearch} />
            </div>

            {/* Quick Categories */}
            {!selectedGenre && results.length === 0 && (
                <div className="mb-10 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-400 mb-4">Categorías Rápidas</h2>
                    <div className="flex flex-wrap gap-3">
                        {GENRES.map(genre => (
                            <button
                                key={genre.id}
                                onClick={() => handleGenreClick(genre.id)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-sm font-medium text-white transition-all transform active:scale-95 hover:border-primary/50 flex items-center gap-2"
                            >
                                <span>{genre.emoji}</span> {genre.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Results Header */}
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                    {selectedGenre ? `Películas de ${GENRES.find(g => g.id === selectedGenre)?.name}` :
                        results.length > 0 ? "Resultados" : "Tendencias de Búsqueda"}
                </h2>
                {selectedGenre && (
                    <button onClick={() => { setSelectedGenre(null); setResults([]); }} className="text-xs text-primary hover:text-white transition-colors">
                        Limpiar filtro
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {moviesToShow.map(movie => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            onClick={onSelectMovie}
                        />
                    ))}
                    {moviesToShow.length === 0 && !loading && (
                        <div className="col-span-full text-center py-20 text-gray-500">
                            No se encontraron resultados
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchView;
