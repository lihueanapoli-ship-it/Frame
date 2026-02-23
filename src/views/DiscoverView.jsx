import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { getTrendingMovies, getCustomCollection } from '../api/tmdb';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useMovies } from '../contexts/MovieContext';
import { getPersonalizedRecommendations } from '../utils/recommendations';
import HeroCarousel from '../components/domain/HeroCarousel';
import { Loader2, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';

const MovieSection = ({ title, subtitle, movies, onSelectMovie, categoryId, variant = 'default', isEmpty = false, emptyMessage, showAll = false }) => {
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

    if (isEmpty && emptyMessage) {
        return (
            <section className="mb-8" id={categoryId}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl md:text-3xl font-display text-white">{title}</h2>
                </div>
                <div className="bg-surface/30 border border-white/10 rounded-xl p-8 text-center">
                    <Sparkles className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                    <p className="text-text-secondary max-w-md mx-auto">{emptyMessage}</p>
                </div>
            </section>
        );
    }

    return (
        <section className="mb-8" id={categoryId} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-display text-white mb-1">{title}</h2>
                    {subtitle && (
                        <p className={cn("text-sm text-gray-400 transition-all duration-300", isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1")}>
                            {subtitle}
                        </p>
                    )}
                </div>
                {categoryId && !showAll && (
                    <Link to={`/category/${categoryId}`} className="text-primary hover:text-primary-hover transition-colors flex items-center gap-1 text-sm">
                        <span>Ver todo</span><ChevronRight className="w-4 h-4" />
                    </Link>
                )}
            </div>
            <div ref={scrollRef}
                className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory select-none touch-pan-y"
                onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
                {(showAll ? movies : movies.slice(0, 20)).map((movie) => (
                    <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[170px] md:w-[200px] snap-start">
                        <MovieCard movie={movie} onClick={() => onSelectMovie(movie)} variant={variant} />
                    </div>
                ))}
            </div>
        </section>
    );
};

const DiscoverView = ({ onSelectMovie }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ trending: [], must_watch: [], short: [], conversation: [], tech: [], argentina: [], thriller: [], romance: [], real_life: [], sagas: [], classic_author: [], forYou: [] });
    const { expertiseLevel, trackBehavior } = useUserProfile();
    const { watched, watchlist } = useMovies();

    useEffect(() => { fetchAll(); trackBehavior('discoverViewCount', 1); }, []);
    useEffect(() => { if (watched.length > 0) fetchPersonalizedRecommendations(); }, [watched.length, expertiseLevel]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [trending, must_watch, short, conversation, tech, argentina, thriller, romance, real_life, sagas, classic_author] = await Promise.all([
                getTrendingMovies(), getCustomCollection('must_watch'), getCustomCollection('short'), getCustomCollection('conversation'), getCustomCollection('tech'),
                getCustomCollection('argentina'), getCustomCollection('thriller'), getCustomCollection('romance'), getCustomCollection('real_life'), getCustomCollection('sagas'), getCustomCollection('classic_author')
            ]);
            setData({ trending, must_watch, short, conversation, tech, argentina, thriller, romance, real_life, sagas, classic_author, forYou: [] });
            if (watched.length > 0) fetchPersonalizedRecommendations();
        } catch (error) { console.error("Error fetching movies:", error); } finally { setLoading(false); }
    };

    const fetchPersonalizedRecommendations = async () => {
        if (watched.length === 0) return;
        try {
            const userData = { movieData: { watched, watchlist } };
            const recommendations = await getPersonalizedRecommendations(userData, expertiseLevel);
            setData(prev => ({ ...prev, forYou: recommendations.forYou || [] }));
        } catch (error) { console.error('Error fetching recommendations:', error); }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

    return (
        <div className="pb-16 pt-4 md:pt-8">
            <header className="mb-4 md:mb-8 flex items-end justify-between border-b border-white/5 pb-4 md:pb-6 overflow-hidden">
                <div className="relative w-full">
                    <motion.div
                        initial={{ x: "40vw", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <h1 className="text-3xl md:text-6xl font-display font-bold text-white mb-1 md:mb-2 tracking-tight">
                            DESCUBRIR <span className="text-primary">CINE</span>
                        </h1>
                        <p className="font-mono text-[10px] md:text-sm text-gray-400">
                            ESTRENOS Y CLÁSICOS SELECCIONADOS
                        </p>
                    </motion.div>
                </div>
            </header>

            <div>
                <HeroCarousel movies={data.trending.slice(0, 5)} onSelectMovie={onSelectMovie} />
            </div>

            <div className="space-y-6 mt-8">
                {watched.length > 0 ? (
                    <MovieSection title="Tu ADN" subtitle="Películas seleccionadas para tu perfil cinematográfico único" movies={data.forYou} onSelectMovie={onSelectMovie} variant="personalized" categoryId="for_you" />
                ) : (
                    <MovieSection title="Tu ADN" isEmpty={true} emptyMessage="Marcá películas como vistas para descubrir tu perfil cinematográfico único y recibir recomendaciones personalizadas basadas en tus gustos." />
                )}
                <MovieSection title="Los Infaltables" subtitle="Clásicos que todo el mundo ama" movies={data.must_watch} onSelectMovie={onSelectMovie} categoryId="must_watch" />
                <MovieSection title="Cortitas y al Pie" subtitle="90 minutos o menos. Directo al grano sin filtros" movies={data.short} onSelectMovie={onSelectMovie} categoryId="short" />
                <MovieSection title="Mate y Sobremesa" subtitle="Historias que todo el mundo ama y que no podés no haber visto" movies={data.conversation} onSelectMovie={onSelectMovie} categoryId="conversation" />
                <MovieSection title="El Laboratorio" subtitle="Sci-fi, distopías y aventuras futuristas" movies={data.tech} onSelectMovie={onSelectMovie} categoryId="tech" />
                <MovieSection title="El Aguante" subtitle="Cine argentino en su máximo esplendor" movies={data.argentina} onSelectMovie={onSelectMovie} categoryId="argentina" variant="argentina" />
                <MovieSection title="Pulso a Mil" subtitle="Thriller, suspenso y adrenalina pura" movies={data.thriller} onSelectMovie={onSelectMovie} categoryId="thriller" variant="thriller" />
                <MovieSection title="Primera Cita" subtitle="Romance, comedia y lo mejor de ambos mundos" movies={data.romance} onSelectMovie={onSelectMovie} categoryId="romance" variant="romance" />
                <MovieSection title="Misiones de Verdad" subtitle="Casos reales que demuestran que la posta supera la ficción" movies={data.real_life} onSelectMovie={onSelectMovie} categoryId="real_life" variant="documentary" />
                <MovieSection title="Viaje de Ida" subtitle="Sagas y trilogías. Garantía Total" movies={data.sagas} onSelectMovie={onSelectMovie} categoryId="sagas" variant="saga" />
                <MovieSection title="Solo para Locos" subtitle="Filtro de autor. Técnica, encuadre y alma para los que buscamos el cine en estado puro." movies={data.classic_author} onSelectMovie={onSelectMovie} categoryId="classic_author" variant="cult" />
            </div>
        </div>
    );
};

export default DiscoverView;
