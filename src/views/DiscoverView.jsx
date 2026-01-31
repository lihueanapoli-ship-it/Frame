import React, { useEffect, useState } from 'react';
import { getTrendingMovies } from '../api/tmdb';
import HeroCarousel from '../components/domain/HeroCarousel';
import { Loader2 } from 'lucide-react'; // Fallback icon

const DiscoverView = ({ onSelectMovie }) => {
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const movies = await getTrendingMovies();
                setTrending(movies);
            } catch (err) {
                console.error("Failed to load trending", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTrending();
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
            <HeroCarousel movies={trending.slice(0, 5)} onRegisterAction={onSelectMovie} />

            <div className="px-4 mt-8 space-y-8">
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-white">Tendencias Ahora</h3>
                    </div>
                    {/* Horizontal list placeholder for now */}
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                        {trending.map(m => (
                            <div
                                key={m.id}
                                onClick={() => onSelectMovie(m)}
                                className="snap-start shrink-0 w-[140px] md:w-[180px] cursor-pointer hover:opacity-80 transition-all active:scale-95"
                            >
                                <div className="aspect-[2/3] bg-surface rounded-xl overflow-hidden mb-2">
                                    <img
                                        src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                                        className="w-full h-full object-cover"
                                        alt=""
                                        loading="lazy"
                                    />
                                </div>
                                <p className="text-sm font-medium text-white truncate">{m.title}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DiscoverView;
