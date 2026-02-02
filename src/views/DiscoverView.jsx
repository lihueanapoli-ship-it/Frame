import React, { useEffect, useState } from 'react';
import { getTrendingMovies, getTopRatedMovies, getMoviesByGenre, getCustomCollection } from '../api/tmdb';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useMovies } from '../contexts/MovieContext';
import { getPersonalizedRecommendations } from '../utils/recommendations';
import HeroCarousel from '../components/domain/HeroCarousel';
import { Loader2, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

// ... imports
import MovieCard from '../components/MovieCard'; // Import our new powerful card

const MovieSection = ({ title, subtitle, movies, onSelectMovie, categoryId, variant = 'default' }) => {
    return (
        <section className="mb-8">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-display text-white mb-1">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-sm text-gray-400">
                            {subtitle}
                        </p>
                    )}
                </div>
                {categoryId && (
                    <Link
                        to={`/category/${categoryId}`}
                        className="text-primary hover:text-primary-hover transition-colors flex items-center gap-1 text-sm"
                    >
                        <span>Ver todo</span>
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                )}
            </div>

            {/* Movies Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {movies.slice(0, 10).map((movie) => (
                    <div key={movie.id} className="flex-shrink-0 w-[200px] snap-start">
                        <MovieCard
                            movie={movie}
                            onClick={() => onSelectMovie(movie)}
                            variant={variant}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
};

const DiscoverView = ({ onSelectMovie }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        trending: [],
        topRated: [],
        must_watch: [],
        short: [],
        conversation: [],
        tech: [],
        argentina: [],
        thriller: [],
        romance: [],
        real_life: [],
        sagas: [],
        classic_author: [],
        // NUEVO: Recomendaciones personalizadas
        forYou: []
    });

    // Hooks de contexto
    const { profile, expertiseLevel, trackBehavior } = useUserProfile();
    const { watched, watchlist } = useMovies();

    useEffect(() => {
        fetchAll();
        // Track que el usuario visitó Discover
        trackBehavior('discoverViewCount', 1);
    }, []);

    // Re-fetch recomendaciones cuando cambie la biblioteca
    useEffect(() => {
        if (watched.length > 0) {
            fetchPersonalizedRecommendations();
        }
    }, [watched.length, expertiseLevel]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [
                trending,
                topRated,
                must_watch,
                short,
                conversation,
                tech,
                argentina,
                thriller,
                romance,
                real_life,
                sagas,
                classic_author
            ] = await Promise.all([
                getTrendingMovies(),
                getTopRatedMovies(),
                getCustomCollection('must_watch'),
                getCustomCollection('short'),
                getCustomCollection('conversation'),
                getCustomCollection('tech'),
                getCustomCollection('argentina'),
                getCustomCollection('thriller'),
                getCustomCollection('romance'),
                getCustomCollection('real_life'),
                getCustomCollection('sagas'),
                getCustomCollection('classic_author')
            ]);

            setData({
                trending,
                topRated,
                must_watch,
                short,
                conversation,
                tech,
                argentina,
                thriller,
                romance,
                real_life,
                sagas,
                classic_author,
                forYou: [] // Se llena después
            });

            // Fetch recomendaciones personalizadas si el usuario tiene películas
            if (watched.length > 0) {
                fetchPersonalizedRecommendations();
            }
        } catch (error) {
            console.error("Error fetching movies:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPersonalizedRecommendations = async () => {
        if (!profile || watched.length === 0) return;

        try {
            const recommendations = await getPersonalizedRecommendations(
                profile,
                expertiseLevel
            );

            setData(prev => ({
                ...prev,
                forYou: recommendations.forYou || []
            }));
        } catch (error) {
            console.error('[DiscoverView] Error fetching recommendations:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div>
            {/* Hero Carousel */}
            <HeroCarousel movies={data.trending.slice(0, 5)} onSelectMovie={onSelectMovie} />

            <div className="space-y-6 mt-8">
                {/* NUEVO: Sección Personalizada "Según tus gustos" */}
                {data.forYou.length > 0 && (
                    <MovieSection
                        title="Según tus gustos"
                        subtitle="Recomendaciones personalizadas basadas en tu biblioteca"
                        movies={data.forYou}
                        onSelectMovie={onSelectMovie}
                        variant="personalized"
                    />
                )}

                {/* Colecciones Originales */}
                <MovieSection
                    title="Popular esta semana"
                    subtitle="Lo más visto en los últimos días"
                    movies={data.trending}
                    onSelectMovie={onSelectMovie}
                />

                <MovieSection
                    title="Mejor Rankeadas"
                    subtitle="Las películas con mejor puntuación de la historia"
                    movies={data.topRated}
                    onSelectMovie={onSelectMovie}
                />

                <MovieSection
                    title="Los Infaltables"
                    subtitle="Clásicos que todo el mundo ama y que no podés no haber visto"
                    movies={data.must_watch}
                    onSelectMovie={onSelectMovie}
                    categoryId="must_watch"
                />

                <MovieSection
                    title="Cortitas y al Pie"
                    subtitle="90 minutos o menos. Directo al grano sin filtros"
                    movies={data.short}
                    onSelectMovie={onSelectMovie}
                    categoryId="short"
                />

                <MovieSection
                    title="Mate y Sobremesa"
                    subtitle="Historias que todo el mundo ama y que no podés no haber visto"
                    movies={data.conversation}
                    onSelectMovie={onSelectMovie}
                    categoryId="conversation"
                />

                <MovieSection
                    title="El Laboratorio"
                    subtitle="Sci-fi, distopías y aventuras futuristas"
                    movies={data.tech}
                    onSelectMovie={onSelectMovie}
                    categoryId="tech"
                />

                <MovieSection
                    title="El Aguante"
                    subtitle="Cine argentino en su máximo esplendor"
                    movies={data.argentina}
                    onSelectMovie={onSelectMovie}
                    categoryId="argentina"
                    variant="argentina"
                />

                <MovieSection
                    title="Pulso a Mil"
                    subtitle="Thriller, suspenso y adrenalina pura"
                    movies={data.thriller}
                    onSelectMovie={onSelectMovie}
                    categoryId="thriller"
                    variant="thriller"
                />

                <MovieSection
                    title="Primera Cita"
                    subtitle="Romance, comedia y lo mejor de ambos mundos"
                    movies={data.romance}
                    onSelectMovie={onSelectMovie}
                    categoryId="romance"
                    variant="romance"
                />

                <MovieSection
                    title="Misiones de Verdad"
                    subtitle="Casos reales que demuestran que la posta supera la ficción"
                    movies={data.real_life}
                    onSelectMovie={onSelectMovie}
                    categoryId="real_life"
                    variant="documentary"
                />

                <MovieSection
                    title="Viaje de Ida"
                    subtitle="Sagas y trilogías. Garantía Total"
                    movies={data.sagas}
                    onSelectMovie={onSelectMovie}
                    categoryId="sagas"
                    variant="saga"
                />

                <MovieSection
                    title="Solo para Locos"
                    subtitle="Filtro de autor. Técnica, encuadre y alma para los que buscamos el cine en estado puro."
                    movies={data.classic_author}
                    onSelectMovie={onSelectMovie}
                    categoryId="classic_author"
                    variant="cult"
                />
            </div>
        </div>
    );
};

export default DiscoverView;
