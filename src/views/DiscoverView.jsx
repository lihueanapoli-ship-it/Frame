import React, { useEffect, useState } from 'react';
import { getTrendingMovies, getTopRatedMovies, getMoviesByGenre } from '../api/tmdb';
import HeroCarousel from '../components/domain/HeroCarousel';
import { Loader2 } from 'lucide-react';

const MovieSection = ({ title, movies, onSelectMovie }) => {
    if (!movies || movies.length === 0) return null;
    return (
        <section className="mb-8 pl-4">
            <h3 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-primary rounded-full"></span>
                {title}
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-6 snap-x hide-scrollbar pr-4">
                {movies.map(m => (
                    <div
                        key={m.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectMovie(m);
                        }}
                        className="snap-start shrink-0 w-[140px] md:w-[180px] cursor-pointer group relative z-10"
                    >
                        <div className="aspect-[2/3] bg-surface rounded-xl overflow-hidden mb-2 shadow-lg group-hover:shadow-primary/20 group-hover:scale-105 transition-all duration-300 border border-white/5">
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
                        <p className="text-sm font-medium text-gray-300 truncate group-hover:text-white transition-colors">{m.title}</p>
                    </div>
                ))}
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
        featured: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Parallel fetching for speed
                const [trending, topRated, action, horror] = await Promise.all([
                    getTrendingMovies(),
                    getTopRatedMovies(),
                    getMoviesByGenre(28), // Action
                    getMoviesByGenre(27)  // Horror
                ]);

                // Mix trending + topRated for the Featured Carousel
                const combined = [...trending, ...topRated].sort(() => 0.5 - Math.random());

                setData({
                    trending,
                    topRated,
                    action,
                    horror,
                    featured: combined.slice(0, 8) // Top 8 mixed movies for hero
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
                <MovieSection title="Tendencias Ahora" movies={data.trending} onSelectMovie={onSelectMovie} />
                <MovieSection title="Aclamadas por la Crítica (Top Rated)" movies={data.topRated} onSelectMovie={onSelectMovie} />
                <MovieSection title="Acción Pura" movies={data.action} onSelectMovie={onSelectMovie} />
                <MovieSection title="Terror Recomendado" movies={data.horror} onSelectMovie={onSelectMovie} />
            </div>
        </div>
    );
};

export default DiscoverView;
