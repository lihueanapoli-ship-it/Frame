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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            let results = [];
            let pageTitle = '';

            try {
                // Map ID to data fetcher
                switch (id) {
                    case 'trending':
                        results = await getTrendingMovies();
                        pageTitle = 'Tendencias Ahora';
                        break;
                    case 'topRated':
                        results = await getTopRatedMovies();
                        pageTitle = 'Aclamadas por la Crítica';
                        break;
                    case 'oscars':
                        results = await getCustomCollection('oscars');
                        pageTitle = 'Ganadoras del Oscar';
                        break;
                    case 'argentina':
                        results = await getCustomCollection('argentina');
                        pageTitle = 'Cine Argentino';
                        break;
                    case 'short':
                        results = await getCustomCollection('short');
                        pageTitle = 'Directo al Grano (< 90 min)';
                        break;
                    case 'mind_bending':
                        results = await getCustomCollection('mind_bending');
                        pageTitle = 'Ingeniería en el Guion';
                        break;
                    case 'hidden_gems':
                        results = await getCustomCollection('hidden_gems');
                        pageTitle = 'Joyas Ocultas';
                        break;
                    case 'cult':
                        results = await getCustomCollection('cult');
                        pageTitle = 'Cine de Culto';
                        break;
                    case 'true_story':
                        results = await getCustomCollection('true_story');
                        pageTitle = 'Basado en Hechos Reales';
                        break;
                    case 'visuals':
                        results = await getCustomCollection('visuals');
                        pageTitle = 'Visualmente Impactantes';
                        break;
                    case 'sagas':
                        results = await getCustomCollection('sagas');
                        pageTitle = 'Sagas Legendarias';
                        break;
                    case 'conversation':
                        results = await getCustomCollection('conversation');
                        pageTitle = 'Para un Mate';
                        break;
                    case 'action_pure': // Custom ID for generic genre
                        results = await getMoviesByGenre(28);
                        pageTitle = "Acción Pura";
                        break;
                    case 'horror_rec':
                        results = await getMoviesByGenre(27);
                        pageTitle = "Terror Recomendado";
                        break;
                    default:
                        // Fallback or Generic Genre lookup could be added here
                        results = [];
                        pageTitle = 'Categoría';
                }
                setMovies(results);
                setTitle(pageTitle);
            } catch (error) {
                console.error("Error loading category", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        window.scrollTo(0, 0);
    }, [id]);

    return (
        <div className="min-h-screen pb-20 pt-20 px-4 max-w-7xl mx-auto">
            <header className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full bg-surface hover:bg-white/10 transition-colors"
                >
                    <ArrowLeftIcon className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {movies.map(movie => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            onClick={onSelectMovie}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategoryView;
