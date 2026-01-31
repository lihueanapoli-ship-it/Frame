import React, { useEffect, useState } from 'react';
import { getTrendingMovies, getTopRatedMovies, getMoviesByGenre, getCustomCollection } from '../api/tmdb';
import HeroCarousel from '../components/domain/HeroCarousel';
import { Loader2, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

// ... imports
import MovieCard from '../components/MovieCard'; // Import our new powerful card

const MovieSection = ({ title, movies, onSelectMovie, isSpecial = false, categoryId, variant = 'default' }) => {
    if (!movies || movies.length === 0) return null;
    return (
        <section className="mb-12 pl-4">
            <div className="flex items-center justify-between pr-4 mb-5">
                <h3 className={cn(
                    "text-lg md:text-2xl font-bold text-white flex items-center gap-2 tracking-wide",
                    isSpecial && "text-yellow-500"
                )}>
                    {title}
                </h3>
                {categoryId && (
                    <Link
                        to={`/category/${categoryId}`}
                        className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary/90 hover:text-primary transition-colors uppercase tracking-widest py-1 pl-3 active:scale-95"
                    >
                        Ver Todo <ChevronRight className="w-4 h-4" />
                    </Link>
                )}
            </div>
            <div className="flex gap-5 overflow-x-auto pb-8 snap-x hide-scrollbar pr-4 items-stretch">
                {movies.map(m => (
                    <div className={cn("snap-start shrink-0 relative z-10", variant === 'visuals' ? "w-[280px]" : "w-[160px] md:w-[200px]")} key={m.id}>
                        <MovieCard movie={m} onClick={onSelectMovie} variant={variant} />
                    </div>
                ))}

                {/* 'See More' functionality moved to header title only */}
            </div>
        </section>
    );
};

const DiscoverView = ({ onSelectMovie }) => {
    const [data, setData] = useState({
        trending: [],
        topRated: [],
        action: [],
        horror: [],
        oscars: [],
        argentina: [],
        short: [],
        mindBending: [],
        hiddenGems: [],
        cult: [],
        trueStory: [],
        visuals: [],
        sagas: [],
        conversation: [],
        featured: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Parallel fetching for speed
                const [
                    trending,
                    topRated,
                    action,
                    horror,
                    // Custom Collections
                    oscars,
                    argentina,
                    short,
                    mindBending,
                    hiddenGems,
                    cult,
                    trueStory,
                    visuals,
                    sagas,
                    conversation
                ] = await Promise.all([
                    getTrendingMovies(),
                    getTopRatedMovies(),
                    getMoviesByGenre(28), // Action
                    getMoviesByGenre(27), // Horror
                    getCustomCollection('oscars'),
                    getCustomCollection('argentina'),
                    getCustomCollection('short'),
                    getCustomCollection('mind_bending'),
                    getCustomCollection('hidden_gems'),
                    getCustomCollection('cult'),
                    getCustomCollection('true_story'),
                    getCustomCollection('visuals'),
                    getCustomCollection('sagas'),
                    getCustomCollection('conversation')
                ]);

                // Mix ALL for Hero (Max randomness)
                const combined = [
                    ...trending, ...oscars, ...argentina, ...short, ...mindBending,
                    ...hiddenGems, ...cult, ...trueStory, ...visuals, ...sagas
                ].sort(() => 0.5 - Math.random());

                setData({
                    trending, oscars, argentina, short, mindBending, hiddenGems,
                    cult, trueStory, visuals, sagas, conversation,
                    featured: combined.slice(0, 10)
                });
            } catch (err) {
                console.error("Failed to load dashboard", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-primary">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    return (
        <div className="pb-24">
            {/* Main Featured Carousel (Randomized Mix) */}
            <HeroCarousel movies={data.featured} onRegisterAction={onSelectMovie} />

            <div className="mt-8 space-y-2">
                <MovieSection title="👑 Ganadoras del Oscar" movies={data.oscars} onSelectMovie={onSelectMovie} isSpecial={true} categoryId="oscars" variant="oscar" />
                <MovieSection title="🧠 Ingeniería en el Guion" movies={data.mindBending} onSelectMovie={onSelectMovie} categoryId="mind_bending" variant="mind_bending" />
                <MovieSection title="🇦🇷 Joyas del Cine Argentino" movies={data.argentina} onSelectMovie={onSelectMovie} categoryId="argentina" variant="argentina" />
                <MovieSection title="⏳ Cine Express" movies={data.short} onSelectMovie={onSelectMovie} categoryId="short" variant="short" />
                <MovieSection title="💎 Joyas Ocultas" movies={data.hiddenGems} onSelectMovie={onSelectMovie} categoryId="hidden_gems" variant="hidden_gems" />
                <MovieSection title="📜 Basado en Hechos Reales" movies={data.trueStory} onSelectMovie={onSelectMovie} categoryId="true_story" variant="true_story" />
                <MovieSection title="🎨 Fotogramas Perfectos" movies={data.visuals} onSelectMovie={onSelectMovie} categoryId="visuals" variant="visuals" />
                <MovieSection title="📼 Cine de Culto" movies={data.cult} onSelectMovie={onSelectMovie} categoryId="cult" variant="cult" />
                <MovieSection title="📚 Grandes Sagas" movies={data.sagas} onSelectMovie={onSelectMovie} categoryId="sagas" variant="sagas" />
                <MovieSection title="🧉 Para un Mate de por medio" movies={data.conversation} onSelectMovie={onSelectMovie} categoryId="conversation" variant="conversation" />
            </div>
        </div>
    );
};

export default DiscoverView;
