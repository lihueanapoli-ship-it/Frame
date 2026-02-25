import React, { useEffect, useState, useRef } from 'react';
import { getTrendingMovies, getCustomCollection } from '../api/tmdb';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useMovies } from '../contexts/MovieContext';
import { getPersonalizedRecommendations } from '../utils/recommendations';
import HeroCarousel from '../components/domain/HeroCarousel';
import { Loader2, ChevronRight, Sparkles, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import ExclusionModal from '../components/ui/ExclusionModal';

const MovieSection = ({ title, subtitle, movies, onSelectMovie, categoryId, variant = 'default', isEmpty = false, emptyMessage, showAll = false, headerAction, isLoading: isSectionLoading }) => {
    const [isHovered, setIsHovered] = useState(false);
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
        scrollRef.current.style.cursor = 'grabbing';
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const isLoading = !isEmpty && movies.length === 0;

    if (isEmpty && emptyMessage) {
        return (
            <section className="mb-8 content-visibility-auto" id={categoryId}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl md:text-3xl font-display text-white">{title}</h2>
                    {headerAction}
                </div>
                <div className="bg-surface/30 border border-white/10 rounded-xl p-8 text-center">
                    <Sparkles className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                    <p className="text-text-secondary max-w-md mx-auto">{emptyMessage}</p>
                </div>
            </section>
        );
    }

    return (
        <section className="mb-8 content-visibility-auto min-h-[300px]" id={categoryId} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col min-w-0">
                    <h2 className="text-xl md:text-2xl font-display text-white tracking-widest uppercase">{title}</h2>
                    {subtitle && (
                        <p className={cn("text-[10px] md:text-xs text-gray-400 transition-all duration-300 line-clamp-1", isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1")}>
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {headerAction}
                    {categoryId && !showAll && movies.length > 0 && (
                        <Link to={`/category/${categoryId}`} className="text-primary hover:text-primary-hover transition-colors flex items-center gap-1 text-sm">
                            <span>Ver todo</span><ChevronRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
            </div>
            <div ref={scrollRef}
                className={cn(
                    "flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory select-none touch-auto transition-all duration-500",
                    isSectionLoading ? "opacity-30 scale-[0.98] blur-[2px] pointer-events-none" : "opacity-100 scale-100 blur-0"
                )}
                onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[140px] sm:w-[170px] md:w-[200px] aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
                    ))
                ) : (
                    (showAll ? movies : movies.slice(0, 20)).map((movie) => (
                        <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[170px] md:w-[200px] snap-start">
                            <MovieCard movie={movie} onClick={() => onSelectMovie(movie)} variant={variant} />
                        </div>
                    ))
                )}
            </div>
        </section>
    );
};

const DiscoverView = ({ onSelectMovie }) => {
    const [loading, setLoading] = useState(true);
    const [adnLoading, setAdnLoading] = useState(false);
    const [data, setData] = useState({ trending: [], must_watch: [], short: [], conversation: [], tech: [], argentina: [], thriller: [], romance: [], real_life: [], sagas: [], classic_author: [], forYou: [] });
    const { profile, updateProfile, expertiseLevel, trackBehavior } = useUserProfile();
    const { watched, watchlist } = useMovies();
    const [showExclusionModal, setShowExclusionModal] = useState(false);

    useEffect(() => {
        fetchInitialData();
        trackBehavior('discoverViewCount', 1);
    }, []);

    useEffect(() => {
        if (watched.length > 0 && profile) {
            fetchPersonalizedRecommendations();
        }
    }, [
        watched.length,
        expertiseLevel,
        profile?.preferences?.excludedGenres?.length,
        profile?.preferences?.excludedCountries?.length,
        JSON.stringify(profile?.preferences?.excludedGenres || []),
        JSON.stringify(profile?.preferences?.excludedCountries || [])
    ]);

    const fetchInitialData = async () => {
        try {
            const trending = await getTrendingMovies();
            setData(prev => ({ ...prev, trending }));
            setLoading(false);

            fetchBackgroundData();
        } catch (error) {
            console.error("Error fetching initial data:", error);
            setLoading(false);
        }
    };

    const fetchBackgroundData = async () => {
        const collections = [
            { key: 'must_watch', id: 'must_watch' },
            { key: 'short', id: 'short' },
            { key: 'conversation', id: 'conversation' },
            { key: 'tech', id: 'tech' },
            { key: 'argentina', id: 'argentina' },
            { key: 'thriller', id: 'thriller' },
            { key: 'romance', id: 'romance' },
            { key: 'real_life', id: 'real_life' },
            { key: 'sagas', id: 'sagas' },
            { key: 'classic_author', id: 'classic_author' }
        ];

        for (const col of collections) {
            getCustomCollection(col.key).then(movies => {
                setData(prev => ({ ...prev, [col.key]: movies }));
            });
        }
    };

    const fetchPersonalizedRecommendations = async () => {
        setAdnLoading(true);
        try {
            const userData = {
                movieData: { watched, watchlist },
                preferences: profile?.preferences || {}
            };
            const recommendations = await getPersonalizedRecommendations(userData, expertiseLevel);
            setData(prev => ({ ...prev, forYou: recommendations.forYou || [] }));
        } catch (error) {
            console.error('Error fetching recommendations:', error);
        } finally {
            setAdnLoading(false);
        }
    };

    const handleSaveExclusions = async (newPreferences) => {
        await updateProfile({ preferences: newPreferences });
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

    return (
        <div className="pb-16">
            <header className="mb-2 md:mb-4 flex items-end justify-between border-b border-white/5 pb-2 md:pb-4 overflow-hidden">
                <div className="relative w-full">
                    <div className="animate-slide-in-left">
                        <h1 className="text-3xl md:text-6xl font-display font-bold text-white mb-1 md:mb-2 tracking-tight">
                            DESCUBRIR <span className="text-primary">CINE</span>
                        </h1>
                        <p className="font-mono text-[10px] md:text-sm text-gray-400">
                            ESTRENOS Y CLÁSICOS SELECCIONADOS
                        </p>
                    </div>
                </div>
            </header>

            <div>
                <HeroCarousel movies={data.trending.slice(0, 5)} onSelectMovie={onSelectMovie} />
            </div>

            <div className="space-y-6 mt-6">
                {watched.length > 0 ? (
                    <MovieSection
                        title="Tu ADN"
                        movies={data.forYou}
                        onSelectMovie={onSelectMovie}
                        variant="personalized"
                        categoryId="for_you"
                        isLoading={adnLoading}
                        headerAction={
                            <div className="flex items-center gap-2">
                                {adnLoading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                                <button
                                    onClick={() => setShowExclusionModal(true)}
                                    className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all text-gray-400 hover:text-white group flex items-center gap-2"
                                    title="Configurar exclusiones"
                                >
                                    <Filter className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold hidden sm:inline">FILTRAR</span>
                                </button>
                            </div>
                        }
                    />
                ) : (
                    <MovieSection
                        title="Tu ADN"
                        isEmpty={true}
                        emptyMessage="Marcá películas como vistas para descubrir tu perfil cinematográfico único y recibir recomendaciones personalizadas basadas en tus gustos."
                        headerAction={
                            <button
                                onClick={() => setShowExclusionModal(true)}
                                className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all text-gray-400 hover:text-white group flex items-center gap-2"
                            >
                                <Filter className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold hidden sm:inline">FILTRAR</span>
                            </button>
                        }
                    />
                )}

                <ExclusionModal
                    isOpen={showExclusionModal}
                    onClose={() => setShowExclusionModal(false)}
                    preferences={profile?.preferences}
                    onSave={handleSaveExclusions}
                    recommendations={data.forYou}
                />
                <MovieSection title="Los Infaltables" movies={data.must_watch} onSelectMovie={onSelectMovie} categoryId="must_watch" />
                <MovieSection title="Cortitas y al Pie" movies={data.short} onSelectMovie={onSelectMovie} categoryId="short" />
                <MovieSection title="Mate y Sobremesa" movies={data.conversation} onSelectMovie={onSelectMovie} categoryId="conversation" />
                <MovieSection title="El Laboratorio" movies={data.tech} onSelectMovie={onSelectMovie} categoryId="tech" />
                <MovieSection title="El Aguante" movies={data.argentina} onSelectMovie={onSelectMovie} categoryId="argentina" variant="argentina" />
                <MovieSection title="Pulso a Mil" movies={data.thriller} onSelectMovie={onSelectMovie} categoryId="thriller" variant="thriller" />
                <MovieSection title="Primera Cita" movies={data.romance} onSelectMovie={onSelectMovie} categoryId="romance" variant="romance" />
                <MovieSection title="Misiones de Verdad" movies={data.real_life} onSelectMovie={onSelectMovie} categoryId="real_life" variant="documentary" />
                <MovieSection title="Viaje de Ida" movies={data.sagas} onSelectMovie={onSelectMovie} categoryId="sagas" variant="saga" />
                <MovieSection title="Solo para Locos" movies={data.classic_author} onSelectMovie={onSelectMovie} categoryId="classic_author" variant="cult" />
            </div>
        </div>
    );
};

export default DiscoverView;
