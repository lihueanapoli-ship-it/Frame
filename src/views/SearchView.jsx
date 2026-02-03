import React, { useState, useEffect, useCallback } from 'react';
import { getTrendingMovies, getMoviesByGenre, searchMovies } from '../api/tmdb';
import { getOscarWinners } from '../api/oscarApi';
import SearchBar from '../components/SearchBar';
import MovieCard from '../components/MovieCard';
import { Loader2 } from 'lucide-react';

const GENRES = [
    { id: 28, name: "Acción", emoji: "💥" },
    { id: 12, name: "Aventura", emoji: "🤠" },
    { id: 16, name: "Animación", emoji: "🎨" },
    { id: 35, name: "Comedia", emoji: "🤣" },
    { id: 80, name: "Crimen", emoji: "🕵️" },
    { id: 99, name: "Documental", emoji: "🌍" },
    { id: 18, name: "Drama", emoji: "🎭" },
    { id: 10751, name: "Familia", emoji: "👨‍👩‍👧‍👦" },
    { id: 14, name: "Fantasía", emoji: "🐉" },
    { id: 36, name: "Historia", emoji: "🏛️" },
    { id: 27, name: "Terror", emoji: "👻" },
    { id: 10402, name: "Música", emoji: "🎵" },
    { id: 9648, name: "Misterio", emoji: "🔦" },
    { id: 10749, name: "Romance", emoji: "💘" },
    { id: 878, name: "Ciencia Ficción", emoji: "🚀" },
    { id: 10770, name: "Película de TV", emoji: "📺" },
    { id: 10752, name: "Bélica", emoji: "⚔️" },
    { id: 37, name: "Western", emoji: "🌵" },
];

const SearchView = ({ onSelectMovie }) => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialMovies, setInitialMovies] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [isOscars, setIsOscars] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

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
            setSelectedGenre(prevGenre => {
                if (!prevGenre && !isOscars) setResults([]);
                return prevGenre;
            });
            return;
        }

        setSelectedGenre(null);
        setIsOscars(false);
        setPage(1); // Reset page
        setHasMore(false); // Search endpoint usually gives best matches first, simple pagination often not needed or handled differently. Let's keep it simple for now or implement generic search pagination if requested.
        // Actually, searchMovies API *does* support page, let's enable valid pagination for search too if possible later, but user asked specifically for 'category' load more.

        setLoading(true);
        try {
            const data = await searchMovies(query);
            setResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [isOscars]);

    const handleGenreClick = async (genreId) => {
        setSelectedGenre(genreId);
        setIsOscars(false);
        setPage(1);
        setHasMore(true);
        setLoading(true);
        try {
            const data = await getMoviesByGenre(genreId, 1);
            setResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleOscarClick = async () => {
        setIsOscars(true);
        setSelectedGenre(null);
        setPage(1);
        setHasMore(false); // Oscars has all movies, no pagination
        setLoading(true);
        try {
            const data = await getOscarWinners();
            setResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (!selectedGenre) return;
        const nextPage = page + 1;
        setPage(nextPage);
        setLoading(true);
        try {
            const data = await getMoviesByGenre(selectedGenre, nextPage);
            if (data.length === 0) {
                setHasMore(false);
            } else {
                setResults(prev => [...prev, ...data]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Determine what to show
    const isSearchingOrFiltered = results.length > 0 || loading || selectedGenre || isOscars;
    const moviesToShow = isSearchingOrFiltered ? results : initialMovies;

    return (
        <div className="p-4 pt-20 pb-24 min-h-screen max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Explorar</h1>

            <div className="mb-8">
                <SearchBar onSelectMovie={onSelectMovie} onSearchCallback={handleSearch} />
            </div>

            {/* Quick Categories */}
            {!selectedGenre && !isOscars && results.length === 0 && (
                <div className="mb-10 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-400 mb-4">Categorías</h2>
                    <div className="flex flex-wrap gap-3">
                        {/* Oscar Winners Special Category */}
                        <button
                            onClick={handleOscarClick}
                            className="px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 hover:from-yellow-600/30 hover:to-orange-600/30 border border-yellow-500/30 rounded-full text-sm font-medium text-yellow-400 transition-all transform active:scale-95 hover:border-yellow-400/50 flex items-center gap-2"
                        >
                            <span>🏆</span> Oscars
                        </button>

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
                    {isOscars ? "🏆 Ganadoras del Oscar a Mejor Película" :
                        selectedGenre ? `Películas de ${GENRES.find(g => g.id === selectedGenre)?.name}` :
                            results.length > 0 ? "Resultados" : "Tendencias de Búsqueda"}
                </h2>
                {(selectedGenre || isOscars) && (
                    <button onClick={() => { setSelectedGenre(null); setIsOscars(false); setResults([]); }} className="text-xs text-primary hover:text-white transition-colors">
                        Limpiar filtro
                    </button>
                )}
            </div>

            {loading && results.length === 0 ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {moviesToShow.map((movie, idx) => (
                        <MovieCard
                            key={`${movie.id}-${idx}`}
                            movie={movie}
                            onClick={onSelectMovie}
                        />
                    ))}
                    {moviesToShow.length === 0 && !loading && (
                        <div className="col-span-full text-center py-20 text-gray-500">
                            No se encontraron resultados
                        </div>
                    )}

                    {/* Load More Button - Only for Categories for now */}
                    {selectedGenre && hasMore && results.length > 0 && (
                        <div className="col-span-full flex justify-center mt-8">
                            <button
                                onClick={loadMore}
                                disabled={loading}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Más películas"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchView;
