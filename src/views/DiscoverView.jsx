import React, { useEffect, useState } from 'react';
import { getTrendingMovies, getTopRatedMovies, getMoviesByGenre, getCustomCollection } from '../api/tmdb';
import HeroCarousel from '../components/domain/HeroCarousel';
import { Loader2, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const MovieSection = ({ title, movies, onSelectMovie, isSpecial = false, categoryId }) => {
    if (!movies || movies.length === 0) return null;
    return (
        <section className="mb-10 pl-4">
            <div className="flex items-center justify-between pr-4 mb-5">
                <h3 className={cn(
                    "text-lg md:text-2xl font-bold text-white flex items-center gap-2 tracking-wide",
                    isSpecial && "text-yellow-500"
                )}>
                    <span className={cn("w-1.5 h-7 rounded-full", isSpecial ? "bg-yellow-500" : "bg-primary")}></span>
                    {title}
                    {isSpecial && <span className="text-2xl ml-2">🏆</span>}
                </h3>
                {categoryId && (
                    <Link to={`/category/${categoryId}`} className="flex items-center text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-wider">
                        Ver todo <ChevronRight className="w-4 h-4" />
                    </Link>
                )}
            </div>
            <div className="flex gap-5 overflow-x-auto pb-6 snap-x hide-scrollbar pr-4">
                {movies.map(m => (
                    <div
                        key={m.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectMovie(m);
                        }}
                        className="snap-start shrink-0 w-[150px] md:w-[200px] cursor-pointer group relative z-10"
                    >
                        <div className={cn(
                            "aspect-[2/3] bg-surface rounded-xl overflow-hidden mb-3 shadow-lg transition-all duration-300 border border-white/5",
                            "group-hover:shadow-primary/20 group-hover:scale-105 group-hover:z-20",
                            isSpecial && "border-yellow-500/50 shadow-yellow-500/10 group-hover:shadow-yellow-500/30 group-hover:border-yellow-400"
                        )}>
                            <img
                                src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                                className="w-full h-full object-cover"
                                alt=""
                                loading="lazy"
                            />
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="bg-white/20 backdrop-blur-md p-2 rounded-full">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                        <p className={cn(
                            "text-sm font-semibold truncate transition-colors",
                            isSpecial ? "text-yellow-100 group-hover:text-yellow-400" : "text-gray-300 group-hover:text-white"
                        )}>{m.title}</p>
                    </div>
                ))}

                {/* 'See More' Card at the end */}
                {categoryId && (
                    <Link
                        to={`/category/${categoryId}`}
                        className="snap-start shrink-0 w-[150px] md:w-[200px] flex flex-col items-center justify-center gap-4 group cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-full bg-surface border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
                            <ChevronRight className="w-8 h-8 text-gray-400 group-hover:text-white" />
                        </div>
                        <span className="text-sm font-semibold text-gray-400 group-hover:text-white transition-colors">Ver Más</span>
                    </Link>
                )}
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

                // Mix for Hero
                const combined = [...trending, ...oscars, ...argentina].sort(() => 0.5 - Math.random());

                setData({
                    trending,
                    topRated,
                    action,
                    horror,
                    oscars,
                    argentina,
                    short,
                    mindBending,
                    hiddenGems,
                    cult,
                    trueStory,
                    visuals,
                    sagas,
                    conversation,
                    featured: combined.slice(0, 8)
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
                <MovieSection title="Tendencias Ahora" movies={data.trending} onSelectMovie={onSelectMovie} categoryId="trending" />
                <MovieSection title="Carrusel de Oro: Best Picture Winners" movies={data.oscars} onSelectMovie={onSelectMovie} isSpecial={true} categoryId="oscars" />
                <MovieSection title="Joyas del Cine Argentino" movies={data.argentina} onSelectMovie={onSelectMovie} categoryId="argentina" />
                <MovieSection title="Directo al Grano ( < 90 min )" movies={data.short} onSelectMovie={onSelectMovie} categoryId="short" />
                <MovieSection title="Ingeniería en el Guion" movies={data.mindBending} onSelectMovie={onSelectMovie} categoryId="mind_bending" />
                <MovieSection title="Joyas Ocultas" movies={data.hiddenGems} onSelectMovie={onSelectMovie} categoryId="hidden_gems" />
                <MovieSection title="Cine de Culto" movies={data.cult} onSelectMovie={onSelectMovie} categoryId="cult" />
                <MovieSection title="Basado en Hechos Reales" movies={data.trueStory} onSelectMovie={onSelectMovie} categoryId="true_story" />
                <MovieSection title="Visualmente Impactantes" movies={data.visuals} onSelectMovie={onSelectMovie} categoryId="visuals" />
                <MovieSection title="Sagas que Marcaron Épocas" movies={data.sagas} onSelectMovie={onSelectMovie} categoryId="sagas" />
                <MovieSection title="Para ver con un Mate" movies={data.conversation} onSelectMovie={onSelectMovie} categoryId="conversation" />
                <MovieSection title="Acción Pura" movies={data.action} onSelectMovie={onSelectMovie} categoryId="action" />
                <MovieSection title="Terror Recomendado" movies={data.horror} onSelectMovie={onSelectMovie} categoryId="horror" />
                <MovieSection title="Aclamadas por la Crítica" movies={data.topRated} onSelectMovie={onSelectMovie} categoryId="top_rated" />
            </div>
        </div>
    );
};

export default DiscoverView;
