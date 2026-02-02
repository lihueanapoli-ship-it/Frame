import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomCollection, getTrendingMovies, getTopRatedMovies, getMoviesByGenre } from '../api/tmdb';
import { getPersonalizedRecommendations } from '../utils/recommendations';
import { useMovies } from '../contexts/MovieContext';
import MovieCard from '../components/MovieCard';
import { ArrowLeftIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

const CategoryView = ({ onSelectMovie }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { watched, watchlist } = useMovies();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // For "Tu ADN" - progressive loading
    const [allRecommendations, setAllRecommendations] = useState([]);
    const [displayCount, setDisplayCount] = useState(20);

    const fetchData = useCallback(async (pageNum, reset = false, currentId = id) => {
        if (pageNum === 1) setLoading(true);
        let results = [];
        let pageTitle = '';

        try {
            switch (currentId) {
                case 'for_you':
                    // Personalized recommendations
                    if (watched.length > 0) {
                        const userData = {
                            movieData: { watched, watchlist }
                        };
                        const recommendations = await getPersonalizedRecommendations(userData, 'intermediate');
                        const allRecs = recommendations.forYou || [];
                        setAllRecommendations(allRecs);
                        results = allRecs.slice(0, displayCount);
                        pageTitle = 'TU ADN';
                    } else {
                        setAllRecommendations([]);
                        results = [];
                        pageTitle = 'TU ADN';
                    }
                    break;
                case 'trending':
                    results = await getTrendingMovies(pageNum);
                    pageTitle = 'TENDENCIAS';
                    break;
                case 'topRated':
                    results = await getTopRatedMovies(pageNum);
                    pageTitle = 'MEJOR RANKEADAS';
                    break;
                case 'action_pure':
                    results = await getMoviesByGenre(28, pageNum);
                    pageTitle = 'ACCIÓN PURA';
                    break;
                case 'horror_rec':
                    results = await getMoviesByGenre(27, pageNum);
                    pageTitle = 'TERROR';
                    break;
                default:
                    results = await getCustomCollection(currentId, pageNum);
                    pageTitle = 'COLECCIÓN';
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
    }, [id, watched, watchlist]);

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

    const loadMore = () => {
        if (id === 'for_you') {
            setDisplayCount(prev => {
                const newCount = prev + 20;
                setMovies(allRecommendations.slice(0, newCount));
                return newCount;
            });
        }
    };

    const canLoadMore = id === 'for_you' && displayCount < allRecommendations.length;

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
                    <h1 className="text-2xl font-display font-bold tracking-widest uppercase text-white">{title}</h1>
                </div>

                {/* Shuffle button - Hidden for "Tu ADN" */}
                {id !== 'for_you' && (
                    <button
                        onClick={shuffle}
                        disabled={loading}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                    >
                        🎲 <span className="hidden md:inline">{loading ? "Cargando..." : "Refrescar"}</span>
                    </button>
                )}
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

                    {/* Load More button - Only for Tu ADN */}
                    {canLoadMore && (
                        <div className="flex justify-center mt-12">
                            <button
                                onClick={loadMore}
                                className="flex flex-col items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                            >
                                <ChevronDownIcon className="w-6 h-6 text-primary group-hover:translate-y-1 transition-transform" />
                                <span className="text-sm font-mono text-gray-400 group-hover:text-white transition-colors">
                                    Ver más recomendaciones
                                </span>
                            </button>
                        </div>
                    )}

                </>
            )}
        </div>
    );
};

export default CategoryView;
