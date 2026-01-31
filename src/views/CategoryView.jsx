import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomCollection, getTrendingMovies, getTopRatedMovies, getMoviesByGenre } from '../api/tmdb';
import MovieCard from '../components/MovieCard';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

const CategoryView = ({ onSelectMovie }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchData = useCallback(async (pageNum, reset = false, currentId = id) => {
        if (pageNum === 1) setLoading(true);
        let results = [];
        let pageTitle = '';

        try {
            switch (currentId) {
                case 'trending':
                    results = await getTrendingMovies(pageNum);
                    pageTitle = 'Tendencias Ahora';
                    break;
                case 'topRated':
                    results = await getTopRatedMovies(pageNum);
                    pageTitle = 'Aclamadas por la Crítica';
                    break;
                case 'action_pure':
                    results = await getMoviesByGenre(28, pageNum);
                    pageTitle = "Acción Pura";
                    break;
                case 'horror_rec':
                    results = await getMoviesByGenre(27, pageNum);
                    pageTitle = "Terror Recomendado";
                    break;
                default:
                    results = await getCustomCollection(currentId, pageNum);

                    const titles = {
                        'oscars': 'Ganadoras del Oscar',
                        'argentina': 'Cine Argentino',
                        'short': 'Directo al Grano (< 90 min)',
                        'mind_bending': 'Ingeniería en el Guion',
                        'hidden_gems': 'Joyas Ocultas',
                        'cult': 'Cine de Culto',
                        'true_story': 'Basado en Hechos Reales',
                        'visuals': 'Visualmente Impactantes',
                        'sagas': 'Sagas Legendarias',
                        'conversation': 'Para un Mate'
                    };
                    pageTitle = titles[currentId] || 'Colección';
            }

            // Validar que seguimos en la misma categoría (Race condition protection simple)
            if (currentId !== id) return;

            if (results.length === 0) {
                if (reset && pageNum > 1) {
                    // Fallback: If random page is empty, try page 1
                    console.log("Page empty, falling back to 1");
                    fetchData(1, true, currentId);
                } else {
                    setHasMore(false);
                }
            } else {
                setMovies(prev => {
                    if (reset) return results;
                    // Deduplicación estricta
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueNew = results.filter(m => !existingIds.has(m.id));
                    return [...prev, ...uniqueNew];
                });
                setTitle(pageTitle);
            }
        } catch (error) {
            console.error("Error loading category", error);
        } finally {
            if (currentId === id) setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        setMovies([]);
        setPage(1);
        setHasMore(true);
        // Reseteamos loading a true inmediatamente al cambiar id
        setLoading(true);
        fetchData(1, true, id);
        window.scrollTo(0, 0);
    }, [id, fetchData]);



    const shuffle = async () => {
        // Adaptive max pages based on category
        let maxPage = 20;
        if (id === 'oscars' || id === 'argentina' || id === 'short') {
            maxPage = 5;
        }

        const randomPage = Math.floor(Math.random() * maxPage) + 1;
        setPage(randomPage);
        setLoading(true);
        // Removed setMovies([]) to prevent flashing empty screen
        window.scrollTo(0, 0);

        await fetchData(randomPage, true, id);
    };

    return (
        <div className="min-h-screen pb-20 pt-20 px-4 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full bg-surface hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeftIcon className="w-6 h-6 text-white" />
                    </button>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
                </div>

                <button
                    onClick={shuffle}
                    disabled={loading}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                >
                    🎲 <span className="hidden md:inline">{loading ? "Cargando..." : "Refrescar"}</span>
                </button>
            </header>

            {loading && movies.length === 0 ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-fade-in">
                        {movies.map((movie) => (
                            <MovieCard
                                key={movie.id}
                                movie={movie}
                                onClick={onSelectMovie}
                                variant={id}
                            />
                        ))}
                    </div>

                </>
            )}
        </div>
    );
};

export default CategoryView;
