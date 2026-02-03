import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getTrendingMovies, getTopRatedMovies, getCustomCollection } from '../api/tmdb';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useMovies } from '../contexts/MovieContext';
import { getPersonalizedRecommendations } from '../utils/recommendations';
import { useMovieFilter } from '../hooks/useMovieFilter';
import HeroCarousel from '../components/domain/HeroCarousel';
import BottomSheet from '../components/ui/BottomSheet';
import { Loader2, ChevronRight, Sparkles, AdjustmentsHorizontalIcon, XMarkIcon } from 'lucide-react'; // Lucide icons used here
import { StarIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/solid'; // Heroicons solid for filter UI consistency
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';

/**
 * MovieSection Component
 * 
 * Subtítulo aparece solo on hover para UI más limpia
 */
const MovieSection = ({ title, subtitle, movies, onSelectMovie, categoryId, variant = 'default', isEmpty = false, emptyMessage, showAll = false }) => {
    const [isHovered, setIsHovered] = useState(false);
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Mouse drag handlers (Netflix-style)
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
        scrollRef.current.style.cursor = 'grabbing';
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        if (scrollRef.current) {
            scrollRef.current.style.cursor = 'grab';
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (scrollRef.current) {
            scrollRef.current.style.cursor = 'grab';
        }
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    if (isEmpty && emptyMessage) {
        return (
            <section className="mb-8" id={categoryId}>
                {/* Section Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl md:text-3xl font-display text-white">
                        {title}
                    </h2>
                </div>

                {/* Empty State */}
                <div className="bg-surface/30 border border-white/10 rounded-xl p-8 text-center">
                    <Sparkles className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                    <p className="text-text-secondary max-w-md mx-auto">
                        {emptyMessage}
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section
            className="mb-8"
            id={categoryId}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-display text-white mb-1">
                        {title}
                    </h2>
                    {/* Subtitle visible on hover */}
                    {subtitle && (
                        <p className={cn(
                            "text-sm text-gray-400 transition-all duration-300",
                            isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                        )}>
                            {subtitle}
                        </p>
                    )}
                </div>
                {/* Ver todo - Siempre visible (except when showAll is true) */}
                {categoryId && !showAll && (
                    <Link
                        to={`/category/${categoryId}`}
                        className="text-primary hover:text-primary-hover transition-colors flex items-center gap-1 text-sm"
                    >
                        <span>Ver todo</span>
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                )}
            </div>

            {/* Movies Horizontal Scroll - Netflix style drag */}
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory cursor-grab select-none"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                {(showAll ? movies : movies.slice(0, 20)).map((movie) => (
                    <div
                        key={movie.id}
                        className="flex-shrink-0 w-[200px] snap-start"
                    >
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
        // Tu ADN (personalizado)
        forYou: []
    });

    const { profile, expertiseLevel, trackBehavior } = useUserProfile();
    const { watched, watchlist } = useMovies();

    // Filter UI State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [sortOption, setSortOption] = useState('rating');
    const [minRating, setMinRating] = useState(0);
    const [runtimeFilter, setRuntimeFilter] = useState('any');
    const [yearRange, setYearRange] = useState({ min: 1900, max: new Date().getFullYear() + 5 });

    // Consolidate all movies for filtering
    const allMoviesUnique = useMemo(() => {
        const all = [
            ...data.trending,
            ...data.must_watch,
            ...data.short,
            ...data.conversation,
            ...data.tech,
            ...data.argentina,
            ...data.thriller,
            ...data.romance,
            ...data.real_life,
            ...data.sagas,
            ...data.classic_author,
            ...data.forYou
        ];
        const map = new Map();
        all.forEach(m => { if (m && m.id) map.set(m.id, m); });
        return Array.from(map.values());
    }, [data]);

    // Smart Filtering Hook
    const { filteredMovies } = useMovieFilter(allMoviesUnique, {
        sort: sortOption,
        minRating,
        runtime: runtimeFilter,
        yearRange,
        genres: [] // User requested to exclude genre filter here
    });

    const activeFilterCount = (minRating > 0 ? 1 : 0) + (runtimeFilter !== 'any' ? 1 : 0) + (yearRange.min > 1900 ? 1 : 0);

    const clearFilters = () => {
        setMinRating(0);
        setRuntimeFilter('any');
        setYearRange({ min: 1900, max: new Date().getFullYear() + 5 });
        setSortOption('rating');
    };

    useEffect(() => {
        fetchAll();
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
                forYou: []
            });

            // Fetch recomendaciones si hay películas vistas
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
        if (watched.length === 0) return;

        try {
            console.log('[DiscoverView] Fetching personalized recommendations for', watched.length, 'watched movies');

            // Construct userData with the structure expected by recommendations.js
            const userData = {
                movieData: {
                    watched,
                    watchlist
                }
            };

            const recommendations = await getPersonalizedRecommendations(
                userData,
                expertiseLevel
            );

            console.log('[DiscoverView] Got recommendations:', recommendations.forYou?.length || 0);

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
        <div className="pb-24">

            {/* Header / Filter Actions */}
            <div className="sticky top-20 z-30 flex justify-end px-4 py-2 pointer-events-none">
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className={cn(
                        "pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full shadow-xl backdrop-blur-md border transition-all active:scale-95",
                        activeFilterCount > 0
                            ? "bg-primary text-black border-primary"
                            : "bg-surface/80 text-white border-white/10 hover:bg-surface"
                    )}
                >
                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white border border-[#121212]">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {activeFilterCount > 0 ? (
                /* 🔍 FILTERED RESULTS VIEW */
                <div className="px-4 mt-4 animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-display text-white">Resultados <span className="text-primary">Explorar</span></h2>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-gray-500">{filteredMovies.length} títulos</span>
                            <button onClick={clearFilters} className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1">
                                <XMarkIcon className="w-3 h-3" /> Limpiar
                            </button>
                        </div>
                    </div>

                    {filteredMovies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50 text-center">
                            <Sparkles className="w-12 h-12 text-gray-700 mb-4" />
                            <p className="text-gray-400">No hay coincidencias con estos filtros.</p>
                            <button onClick={clearFilters} className="mt-4 text-primary text-sm font-bold">
                                Restablecer
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-12">
                            {filteredMovies.map(movie => (
                                <MovieCard
                                    key={movie.id}
                                    movie={movie}
                                    onClick={() => onSelectMovie(movie)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* 🏠 STANDARD CAROUSEL VIEW */
                <>
                    {/* Hero Carousel */}
                    <div className="-mt-12"> {/* Negate sticky padding visual */}
                        <HeroCarousel movies={data.trending.slice(0, 5)} onSelectMovie={onSelectMovie} />
                    </div>

                    <div className="space-y-6 mt-8">
                        {/* 🧬 TU ADN */}
                        {watched.length > 0 ? (
                            <MovieSection
                                title="Tu ADN"
                                subtitle="Películas seleccionadas para tu perfil cinematográfico único"
                                movies={data.forYou}
                                onSelectMovie={onSelectMovie}
                                variant="personalized"
                                categoryId="for_you"
                            />
                        ) : (
                            <MovieSection
                                title="Tu ADN"
                                isEmpty={true}
                                emptyMessage="Marcá películas como vistas para descubrir tu perfil cinematográfico único y recibir recomendaciones personalizadas basadas en tus gustos."
                            />
                        )}

                        <MovieSection
                            title="Los Infaltables"
                            subtitle="Clásicos que todo el mundo ama"
                            movies={data.must_watch}
                            onSelectMovie={onSelectMovie}
                            categoryId="must_watch"
                        />
                        <MovieSection
                            title="Cortitas y al Pie"
                            subtitle="90 minutos o menos. Directo al grano"
                            movies={data.short}
                            onSelectMovie={onSelectMovie}
                            categoryId="short"
                        />
                        <MovieSection
                            title="Mate y Sobremesa"
                            subtitle="Historias para charlar"
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
                            subtitle="Casos reales"
                            movies={data.real_life}
                            onSelectMovie={onSelectMovie}
                            categoryId="real_life"
                            variant="documentary"
                        />
                        <MovieSection
                            title="Viaje de Ida"
                            subtitle="Sagas y trilogías"
                            movies={data.sagas}
                            onSelectMovie={onSelectMovie}
                            categoryId="sagas"
                            variant="saga"
                        />
                        <MovieSection
                            title="Solo para Locos"
                            subtitle="Cine de autor y culto"
                            movies={data.classic_author}
                            onSelectMovie={onSelectMovie}
                            categoryId="classic_author"
                            variant="cult"
                        />
                    </div>
                </>
            )}

            {/* Filter Bottom Sheet */}
            {createPortal(
                <BottomSheet
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                    title="Filtros de Exploración"
                >
                    <div className="space-y-8 pb-8">
                        {/* 1. Sort Section */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Ordenar Por</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'rating', label: 'Valoración' },
                                    { id: 'year', label: 'Año' },
                                    { id: 'runtime', label: 'Duración' },
                                    { id: 'popularity', label: 'Popularidad' },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setSortOption(opt.id)}
                                        className={cn(
                                            "p-3 rounded-xl text-sm font-medium border text-center transition-all",
                                            sortOption === opt.id
                                                ? "bg-white text-black border-white ring-2 ring-white/20"
                                                : "bg-surface border-white/5 text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Rating Filter */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Calificación Mínima</h4>
                                <span className="text-xs font-mono text-primary">{minRating > 0 ? `${minRating}+ Estrellas` : 'Cualquiera'}</span>
                            </div>
                            <div className="flex gap-2 justify-between bg-surface-elevated p-3 rounded-xl border border-white/5">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => setMinRating(minRating === star ? 0 : star)}
                                        className="transition-transform active:scale-90"
                                    >
                                        <StarIcon className={cn("w-8 h-8 transition-colors", star <= minRating ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-gray-700")} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Runtime Filter */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Duración</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'short', label: 'Corta', sub: '< 90m' },
                                    { id: 'medium', label: 'Media', sub: '90-120m' },
                                    { id: 'long', label: 'Larga', sub: '> 120m' },
                                ].map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => setRuntimeFilter(runtimeFilter === r.id ? 'any' : r.id)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
                                            runtimeFilter === r.id
                                                ? "bg-primary/20 border-primary text-primary"
                                                : "bg-surface border-white/5 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <ClockIcon className="w-5 h-5 mb-1" />
                                        <span className="text-xs font-bold">{r.label}</span>
                                        <span className="text-[10px] opacity-60 font-mono">{r.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. Years */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Década</h4>
                            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                <button
                                    onClick={() => setYearRange({ min: 1900, max: 2050 })}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap",
                                        yearRange.min === 1900
                                            ? "bg-white text-black border-white"
                                            : "bg-surface border-white/10 text-gray-400"
                                    )}
                                >
                                    Todas
                                </button>
                                {[2020, 2010, 2000, 1990, 1980, 1970].map(decade => {
                                    const isSelected = yearRange.min === decade && yearRange.max === decade + 9;
                                    return (
                                        <button
                                            key={decade}
                                            onClick={() => setYearRange(isSelected ? { min: 1900, max: 2050 } : { min: decade, max: decade + 9 })}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap",
                                                isSelected
                                                    ? "bg-primary text-black border-primary"
                                                    : "bg-surface border-white/10 text-gray-400 hover:text-white"
                                            )}
                                        >
                                            {decade}s
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={clearFilters}
                                className="flex-1 py-3.5 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors border border-white/10"
                            >
                                Limpiar todo
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="flex-[2] py-3.5 bg-primary text-black rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all"
                            >
                                Ver {filteredMovies.length} Películas
                            </button>
                        </div>
                    </div>
                </BottomSheet>,
                document.body
            )}
        </div>
    );
};

export default DiscoverView;
