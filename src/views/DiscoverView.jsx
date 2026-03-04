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
import FeedbackModal from '../components/ui/FeedbackModal';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

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

// Shuffles movies randomly and pushes already-watched movies to the end
const shuffleAndSortWatched = (movies, watchedIds) => {
    const arr = [...movies];
    // Fisher-Yates shuffle for different order every reload
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Stable sort: unwatched first, watched last
    return arr.sort((a, b) => {
        const aW = watchedIds.has(a.id);
        const bW = watchedIds.has(b.id);
        if (aW === bW) return 0;
        return aW ? 1 : -1;
    });
};

const DiscoverView = ({ onSelectMovie }) => {
    const [loading, setLoading] = useState(true);
    const [adnLoading, setAdnLoading] = useState(false);
    const [data, setData] = useState({ trending: [], must_watch: [], short: [], conversation: [], tech: [], argentina: [], thriller: [], romance: [], real_life: [], sagas: [], classic_author: [], forYou: [] });
    const { profile, updateProfile, expertiseLevel, trackBehavior } = useUserProfile();
    const { watched, watchlist } = useMovies();
    const [showExclusionModal, setShowExclusionModal] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

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
            const watchedIds = new Set((watched || []).map(m => m.id));
            setData(prev => ({ ...prev, trending: shuffleAndSortWatched(trending, watchedIds) }));
            setLoading(false);
            fetchBackgroundData();
        } catch (error) {
            console.error("Error fetching initial data:", error);
            setLoading(false);
        }
    };

    const fetchBackgroundData = () => {
        const watchedIds = new Set((watched || []).map(m => m.id));
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
                setData(prev => ({ ...prev, [col.key]: shuffleAndSortWatched(movies, watchedIds) }));
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
        <div className="min-h-screen pt-12 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
            <header className="mb-12 md:mb-16 flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-8 gap-8">
                <div className="animate-slide-in-left">
                    <h1 className="text-4xl md:text-7xl font-display font-extrabold text-white mb-2 tracking-tight">
                        DESCUBRIR <span className="text-primary italic">CINE</span>
                    </h1>
                    <p className="font-mono text-[10px] md:text-xs text-primary/60 uppercase tracking-[0.3em] font-black">
                        ESTRENOS Y CLÁSICOS SELECCIONADOS
                    </p>
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

                {/* Closing message */}
                <div className="mt-16 mb-6 px-2">
                    <div className="relative rounded-[2.5rem] overflow-hidden border border-white/5 bg-gradient-to-br from-white/[0.03] via-transparent to-primary/[0.04] p-8 md:p-12 text-center">
                        {/* Decorative top line */}
                        <div className="flex items-center gap-3 justify-center mb-8">
                            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
                            <span className="text-primary/60 text-xs font-mono tracking-[0.4em] uppercase">Frame</span>
                            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
                        </div>

                        {/* Main message */}
                        <h2 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight mb-6 tracking-tight">
                            Hecho con amor<br />
                            <span className="text-primary">para vos.</span>
                        </h2>

                        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
                            FRAME nació de una idea simple: que encontrar una buena película no debería ser una tarea.
                            Acá podés guardar lo que viste, armar listas con lo que querés ver, compartirlas con tus amigos
                            y descubrir exactamente lo que buscás — sin perder tiempo, sin vueltas.
                        </p>

                        <p className="text-gray-500 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-10 italic">
                            "El cine no es un espejo que refleja la realidad, sino un martillo con el que la moldeas."
                            <span className="block mt-1 text-xs not-italic text-gray-600 font-mono tracking-widest">— Bertolt Brecht</span>
                        </p>

                        {/* Feature pills */}
                        <div className="flex flex-wrap justify-center gap-3 mb-10">
                            {[
                                { icon: '🎬', label: 'Descubrí cine nuevo' },
                                { icon: '📋', label: 'Armá tus listas' },
                                { icon: '🤝', label: 'Compartí con amigos' },
                                { icon: '⚡', label: 'Buscá al instante' },
                                { icon: '⭐', label: 'Calificá lo que viste' },
                            ].map(f => (
                                <span key={f.label} className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/8 rounded-full text-sm text-gray-400 font-mono">
                                    <span>{f.icon}</span>{f.label}
                                </span>
                            ))}
                        </div>

                        {/* Closing signature */}
                        <div className="flex items-center gap-3 justify-center mb-8">
                            <div className="h-px w-8 bg-white/10" />
                            <p className="text-xs text-gray-600 font-mono uppercase tracking-[0.3em]">Gracias por estar acá ✦</p>
                            <div className="h-px w-8 bg-white/10" />
                        </div>

                        {/* Feedback button */}
                        <button
                            onClick={() => setIsFeedbackOpen(true)}
                            className="inline-flex items-center gap-3 px-7 py-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/60 rounded-2xl text-primary font-semibold transition-all group active:scale-95 shadow-lg shadow-primary/5"
                        >
                            <ChatBubbleLeftRightIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            Contanos qué te parece FRAME
                        </button>
                    </div>
                </div>
            </div>

            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        </div>
    );
};

export default DiscoverView;
