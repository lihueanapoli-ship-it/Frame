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

    const [allRecommendations, setAllRecommendations] = useState([]);
    const [displayCount, setDisplayCount] = useState(20);

    const fetchData = useCallback(async (pageNum, reset = false, currentId = id) => {
        setLoading(true);

        let results = [];
        let pageTitle = '';

        try {
            switch (currentId) {
                case 'for_you':
                    if (watched.length > 0) {
                        if (allRecommendations.length === 0 || reset) {
                            const userData = {
                                movieData: { watched, watchlist }
                            };
                            const recommendations = await getPersonalizedRecommendations(userData, 'intermediate');
                            const allRecs = recommendations.forYou || [];

                            const uniqueRecs = Array.from(new Map(allRecs.map(item => [item.id, item])).values());

                            setAllRecommendations(uniqueRecs);
                            results = uniqueRecs.slice(0, displayCount);
                        } else {
                            results = [];
                        }
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

            if (currentId !== id) return;

            if (id !== 'for_you') {
                if (results.length === 0) {
                    if (reset && pageNum > 1) {
                    } else {
                        setHasMore(false);
                    }
                } else {
                    setMovies(prev => {
                        if (reset) return results;
                        const existingIds = new Set(prev.map(m => m.id));
                        const uniqueNew = results.filter(m => !existingIds.has(m.id));
                        return [...prev, ...uniqueNew];
                    });
                }
            } else {
                if (reset && allRecommendations.length === 0) {
                    setMovies(results);
                }
            }

            if (pageTitle) setTitle(pageTitle);

        } catch (error) {
            console.error("Error loading category", error);
        } finally {
            if (currentId === id) setLoading(false);
        }
    }, [id, watched, watchlist, displayCount, allRecommendations.length]);

    useEffect(() => {
        setMovies([]);
        setPage(1);
        setHasMore(true);
        setDisplayCount(20);
        setAllRecommendations([]);
        setLoading(true);
        fetchData(1, true, id);
        window.scrollTo(0, 0);
    }, [id]);

    const shuffle = async () => {
        let maxPage = 20;
        if (id === 'oscars' || id === 'argentina' || id === 'short') {
            maxPage = 5;
        }
        const randomPage = Math.floor(Math.random() * maxPage) + 1;
        setPage(randomPage);
        setLoading(true);
        window.scrollTo(0, 0);
        await fetchData(randomPage, true, id);
    };

    const loadMore = async () => {
        if (id === 'for_you') {
            setDisplayCount(prev => {
                const newCount = prev + 20;
                setMovies(allRecommendations.slice(0, newCount));
                return newCount;
            });
        } else {
            const nextPage = page + 1;
            setPage(nextPage);
            await fetchData(nextPage, false, id);
        }
    };

    const canLoadMore = id === 'for_you'
        ? displayCount < allRecommendations.length
        : hasMore;

    return (
        <div className="min-h-screen pb-24 pt-24 px-4 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-display font-bold tracking-widest uppercase text-white">{title}</h1>
                </div>

                {id !== 'for_you' && (
                    <button
                        onClick={shuffle}
                        disabled={loading}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                    >
                        <span className="font-bold text-sm">{loading ? "..." : "Aleatorio"}</span>
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

                    {canLoadMore && (
                        <div className="flex flex-col items-center gap-4 mt-12 pb-12">
                            {id === 'for_you' && (
                                <div className="text-xs font-mono text-gray-500">
                                    Mostrando {movies.length} de {allRecommendations.length}
                                </div>
                            )}
                            <button
                                onClick={loadMore}
                                disabled={loading}
                                className="flex flex-col items-center gap-3 px-8 py-6 bg-surface-elevated hover:bg-white/5 border border-white/10 hover:border-primary/50 rounded-2xl transition-all group active:scale-95 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                ) : (
                                    <ChevronDownIcon className="w-8 h-8 text-primary group-hover:translate-y-2 transition-transform duration-300" />
                                )}
                                <span className="text-sm font-bold text-white tracking-wide uppercase">
                                    {loading ? 'Cargando...' : 'Cargar más películas'}
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
