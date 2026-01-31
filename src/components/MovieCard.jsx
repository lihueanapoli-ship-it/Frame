import React from 'react';
import { getPosterUrl, getBackdropUrl } from '../api/tmdb';
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { ClockIcon } from '@heroicons/react/24/outline'; // Reloj

const MovieCard = ({ movie, onClick, rating, variant = 'default' }) => {

    // --- VARIANT LOGIC ---
    const isOscar = variant === 'oscar';
    const isArgentina = variant === 'argentina';
    const isShort = variant === 'short';
    const isMindBending = variant === 'mind_bending';
    const isHiddenGem = variant === 'hidden_gems';
    const isTrueStory = variant === 'true_story';
    const isVisual = variant === 'visuals';
    const isCult = variant === 'cult';
    const isSaga = variant === 'sagas';

    // --- METADATA HELPERS ---
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

    return (
        <div
            onClick={() => onClick(movie)}
            className={cn(
                "group relative bg-surface rounded-xl overflow-hidden shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1",
                isOscar && "border border-yellow-500/30 shadow-yellow-500/10 hover:shadow-yellow-500/40 hover:border-yellow-400",
                isArgentina && "border border-sky-400/20 hover:border-sky-400",
                isMindBending && "hover:rotate-1 hover:scale-105 transition-transform duration-500"
            )}
        >
            {/* Visual Aspect: Poster vs Backdrop */}
            <div className={cn(
                "w-full overflow-hidden relative",
                isVisual ? "aspect-[16/9]" : "aspect-[2/3]"
            )}>
                {/* Sagas Stack Effect */}
                {isSaga && (
                    <>
                        <div className="absolute top-2 left-2 right-2 bottom-0 bg-white/5 rounded-t-lg transform -translate-y-2 scale-95 z-0" />
                        <div className="absolute top-4 left-4 right-4 bottom-0 bg-white/5 rounded-t-lg transform -translate-y-4 scale-90 z-[-1]" />
                    </>
                )}

                <img
                    src={isVisual ? getBackdropUrl(movie.backdrop_path) : getPosterUrl(movie.poster_path)}
                    alt={movie.title}
                    className={cn(
                        "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                        isHiddenGem && "brightness-75 group-hover:brightness-110 saturate-50 group-hover:saturate-100 transition-[filter,transform]"
                    )}
                    loading="lazy"
                />

                {/* Overlays / Badges */}
                {isOscar && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1 z-10">
                        <span>🏆</span> {year}
                    </div>
                )}

                {isArgentina && (
                    <div className="absolute top-2 right-2 z-10">
                        <img src="https://flagcdn.com/w40/ar.png" alt="AR" className="w-5 h-auto rounded shadow-sm opacity-90" />
                    </div>
                )}

                {isShort && (
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 z-10 border border-white/10">
                        <ClockIcon className="w-3 h-3 text-primary" /> {'< 90m'}
                    </div>
                )}

                {isTrueStory && (
                    <div className="absolute bottom-2 right-2 -rotate-6 bg-white/90 text-black text-[9px] font-black uppercase px-2 py-1 shadow-lg z-10 border-2 border-black/50 tracking-tighter">
                        Historia Real
                    </div>
                )}

                {isMindBending && (
                    <div className="absolute top-2 right-2 bg-purple-900/80 backdrop-blur text-white text-[10px] font-mono px-2 py-0.5 rounded border border-purple-500/30 z-10">
                        🧠 4/5
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
            </div>

            <div className="p-3 relative z-10 bg-surface">
                <h3 className={cn(
                    "font-semibold text-white truncate text-sm md:text-base",
                    isCult && "font-mono tracking-tighter text-gray-200"
                )}>{movie.title}</h3>

                <div className="flex justify-between items-center mt-1">
                    <span className="text-secondary text-xs font-medium">
                        {isOscar ? "Mejor Película" :
                            isArgentina ? "Dir. Argentino" :
                                isShort ? "Ideal Express" :
                                    isVisual ? "Fotografía Pura" :
                                        year}
                    </span>

                    {rating > 0 && !isOscar && (
                        <div className="flex items-center text-yellow-400 gap-1">
                            <Star size={12} fill="currentColor" />
                            <span className="text-xs font-bold">{rating}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MovieCard;
