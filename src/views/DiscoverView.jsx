import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getTrendingMovies, getTopRatedMovies, getCustomCollection } from '../api/tmdb';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useMovies } from '../contexts/MovieContext';
import { getPersonalizedRecommendations, getContextualCollections, getContextualTitle } from '../utils/recommendations';
import HeroCarousel from '../components/domain/HeroCarousel';
import MovieCard from '../components/MovieCard';
import { Loader2, ChevronRight, Sparkles, TrendingUp, Star, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

/**
 * DiscoverView - ADAPTIVE VERSION
 * 
 * Esta vista se adapta según el expertise level del usuario:
 * 
 * NOVICE:
 * - Colecciones populares (clásicos, trending, top rated)
 * - Textos explicativos simples
 * - Foco en facilitar decisiones rápidas
 * 
 * INTERMEDIATE:
 * - Mix de popular + personalizado
 * - "Porque te gustó X" sections
 * - Géneros favoritos destacados
 * 
 * EXPERT:
 * - Highly personalized
 * - Deep cuts (películas raras)
 * - Contexto temporal (hora, día de semana)
 * - Metadata visible
 */

const MovieSection = ({
    title,
    subtitle,
    icon: Icon,
    movies,
    onSelectMovie,
    categoryId,
    variant = 'default',
    loading = false
}) => {
    if (loading) {
        return (
            <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-2" />
                        <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-white/10 rounded-lg animate-pulse" />
                    ))}
                </div>
            </section>
        );
    }

    if (!movies || movies.length === 0) return null;

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
        >
            {/* Section Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        {Icon && <Icon className="w-6 h-6 text-primary" />}
                        <h2 className="text-2xl md:text-3xl font-display text-white">
                            {title}
                        </h2>
                    </div>
                    {subtitle && (
                        <p className="text-sm md:text-base text-text-secondary">
                            {subtitle}
                        </p>
                    )}
                </div>

                {categoryId && (
                    <Link
                        to={`/category/${categoryId}`}
                        className="flex items-center gap-1 text-primary hover:text-primary-hover transition-colors text-sm font-medium"
                    >
                        Ver todo
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                )}
            </div>

            {/* Movies Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {movies.slice(0, 10).map((movie) => (
                    <MovieCard
                        key={movie.id}
                        movie={movie}
                        onClick={() => onSelectMovie(movie)}
                        variant={variant}
                    />
                ))}
            </div>
        </motion.section>
    );
};

const DiscoverView = ({ onSelectMovie }) => {
    const { expertiseLevel, uiConfig, profile, trackBehavior } = useUserProfile();
    const { watched, watchlist } = useMovies();

    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState([]);
    const [heroMovies, setHeroMovies] = useState([]);

    useEffect(() => {
        fetchAdaptiveContent();

        // Track que el usuario visitó Discover
        trackBehavior('discoverViewCount', 1);
    }, [expertiseLevel, watched.length]);

    const fetchAdaptiveContent = async () => {
        setLoading(true);

        try {
            // HERO siempre muestra trending
            const trending = await getTrendingMovies();
            setHeroMovies(trending.slice(0, 5));

            let adaptiveSections = [];

            // ========================================
            // NOVICE: Popular + Classics
            // ========================================
            if (expertiseLevel === 'novice') {
                const [topRated, mustWatch, shortMovies] = await Promise.all([
                    getTopRatedMovies(),
                    getCustomCollection('must_watch'),
                    getCustomCollection('short')
                ]);

                adaptiveSections = [
                    {
                        title: '🔥 Tendencias',
                        subtitle: 'Lo más visto de la semana',
                        icon: TrendingUp,
                        movies: trending,
                        categoryId: null
                    },
                    {
                        title: '⭐ Mejor Rankeadas',
                        subtitle: 'Películas que amas todos',
                        icon: Star,
                        movies: topRated,
                        categoryId: null
                    },
                    {
                        title: '🎬 Los Infaltables',
                        subtitle: 'Clásicos que tenés que ver',
                        icon: null,
                        movies: mustWatch,
                        categoryId: 'must_watch'
                    },
                    {
                        title: '⏱️ Cortitas y al Pie',
                        subtitle: 'Menos de 90 minutos',
                        icon: Clock,
                        movies: shortMovies,
                        categoryId: 'short'
                    }
                ];
            }

            // ========================================
            // INTERMEDIATE: Personalized Mix
            // ========================================
            else if (expertiseLevel === 'intermediate') {
                // Obtener recomendaciones personalizadas
                const recommendations = await getPersonalizedRecommendations(
                    profile,
                    expertiseLevel
                );

                const [thriller, romance] = await Promise.all([
                    getCustomCollection('thriller'),
                    getCustomCollection('romance')
                ]);

                adaptiveSections = [
                    {
                        title: getContextualTitle('forYou', expertiseLevel),
                        subtitle: 'Películas seleccionadas para tu perfil',
                        icon: Sparkles,
                        movies: recommendations.forYou,
                        categoryId: null
                    },
                    {
                        title: '🔥 Tendencias',
                        subtitle: 'Lo más popular ahora',
                        icon: TrendingUp,
                        movies: trending,
                        categoryId: null
                    },
                    {
                        title: getContextualTitle('similar', expertiseLevel),
                        subtitle: 'Basado en películas que rankeaste alto',
                        icon: null,
                        movies: recommendations.similar,
                        categoryId: null
                    },
                    {
                        title: '🎭 Pulso a Mil',
                        subtitle: 'Thriller y misterio',
                        icon: null,
                        movies: thriller,
                        categoryId: 'thriller'
                    },
                    {
                        title: '💕 Primera Cita',
                        subtitle: 'Romance y comedia',
                        icon: null,
                        movies: romance,
                        categoryId: 'romance'
                    }
                ];
            }

            // ========================================
            // EXPERT: Highly Personalized + Deep Cuts
            // ========================================
            else if (expertiseLevel === 'expert') {
                const recommendations = await getPersonalizedRecommendations(
                    profile,
                    expertiseLevel
                );

                const contextualCollections = getContextualCollections(profile);

                const [auteur, argentina] = await Promise.all([
                    getCustomCollection('classic_author'),
                    getCustomCollection('argentina')
                ]);

                adaptiveSections = [
                    {
                        title: getContextualTitle('forYou', expertiseLevel),
                        subtitle: 'Algoritmo personalizado basado en tu biblioteca',
                        icon: Sparkles,
                        movies: recommendations.forYou,
                        categoryId: null
                    },
                    // Contextual (time-based)
                    ...(contextualCollections.length > 0 ? [{
                        title: contextualCollections[0].title,
                        subtitle: contextualCollections[0].subtitle,
                        icon: Clock,
                        movies: [], // TODO: fetch based on filters
                        categoryId: contextualCollections[0].id
                    }] : []),
                    {
                        title: getContextualTitle('deepCuts', 'expert'),
                        subtitle: 'Películas raras con alta calidad',
                        icon: null,
                        movies: recommendations.deepCuts,
                        categoryId: null
                    },
                    {
                        title: '🔥 Trending (Reference)',
                        subtitle: 'Para estar al día',
                        icon: TrendingUp,
                        movies: trending.slice(0, 5), // Menos espacio para trending
                        categoryId: null
                    },
                    {
                        title: '🎨 Solo para Locos',
                        subtitle: 'Cine de autor y experimental',
                        icon: null,
                        movies: auteur,
                        categoryId: 'classic_author'
                    },
                    {
                        title: '🇦🇷 El Aguante',
                        subtitle: 'Cine argentino',
                        icon: null,
                        movies: argentina,
                        categoryId: 'argentina'
                    }
                ];
            }

            setSections(adaptiveSections);
        } catch (error) {
            console.error('[DiscoverView] Error fetching content:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && sections.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-text-secondary">
                        {expertiseLevel === 'novice'
                            ? 'Cargando películas...'
                            : expertiseLevel === 'intermediate'
                                ? 'Personalizando tu feed...'
                                : 'Curando contenido para tu perfil...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Hero Carousel */}
            {heroMovies.length > 0 && (
                <div className="mb-12">
                    <HeroCarousel
                        movies={heroMovies}
                        onSelectMovie={onSelectMovie}
                    />
                </div>
            )}

            {/* Adaptive Sections */}
            <div className="space-y-8">
                {sections.map((section, index) => (
                    <MovieSection
                        key={`${section.title}-${index}`}
                        title={section.title}
                        subtitle={section.subtitle}
                        icon={section.icon}
                        movies={section.movies}
                        onSelectMovie={onSelectMovie}
                        categoryId={section.categoryId}
                        loading={loading}
                    />
                ))}
            </div>
        </motion.div>
    );
};

export default DiscoverView;
