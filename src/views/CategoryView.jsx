import React, { useEffect, useState } from 'react';
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

    const fetchData = async (pageNum, reset = false) => {
        if (pageNum === 1) setLoading(true);
        let results = [];
        let pageTitle = '';

        try {
            switch (id) {
                case 'trending':
                    results = await getTrendingMovies(pageNum);
                    pageTitle = 'Tendencias Ahora';
                    break;
                case 'topRated':
                    results = await getTopRatedMovies(pageNum); // Need to update API too for this if I used it, but trending covers it usually
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
                    // For custom collections that we upgraded to accept page
                    results = await getCustomCollection(id, pageNum);

                    // Titles map fallback
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
                    pageTitle = titles[id] || 'Colección';
            }

            if (results.length === 0) {
                setHasMore(false);
            } else {
                setMovies(prev => reset ? results : [...prev, ...results]);
                setTitle(pageTitle);
            }
        } catch (error) {
            console.error("Error loading category", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMovies([]);
        setPage(1);
        setHasMore(true);
        fetchData(1, true);
        window.scrollTo(0, 0);
    }, [id]);

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchData(nextPage, false);
    };

    const shuffle = () => {
        const randomPage = Math.floor(Math.random() * 50) + 1; // Random page between 1-50
        setPage(randomPage);
        setMovies([]);
        setLoading(true);
        fetchData(randomPage, true);
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
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                >
                    🎲 <span className="hidden md:inline">Sorpréndeme (Refrescar)</span>
                </button>
            </header>

            {loading && movies.length === 0 ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-fade-in">
                        {movies.map((movie, idx) => (
                            <MovieCard
                                key={`${movie.id}-${idx}`} // Idx key fallback for dupes across pages
                                movie={movie}
                                onClick={onSelectMovie}
                                // Variant logic can be inferred from id or default
                                variant={id} // Pass the category ID as variant to keep style consistent!
                            />
                        ))}
                    </div>

                    {hasMore && (
                        <div className="max-w-xs mx-auto mt-12">
                            <button
                                onClick={loadMore}
                                className="w-full py-4 bg-surface border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Cargar Más Películas"}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CategoryView;
