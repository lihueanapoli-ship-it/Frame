import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPosterUrl, getBackdropUrl } from '../api/tmdb';
import { Star, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSound } from '../contexts/SoundContext';
import { useMovies } from '../contexts/MovieContext';
import OscarBadge from './badges/OscarBadge';
import { isOscarWinner } from '../constants/oscarWinners';

const MovieCard = ({ movie, onClick, rating, variant = 'default', onAddToWatchlist, onMarkWatched }) => {
    const [isHovered, setIsHovered] = useState(false);
    const { playHover, playClick } = useSound();
    const { isWatched } = useMovies();

    const watched = isWatched(movie.id);

    // Metadata helpers
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

    return (
        <div
            onClick={() => {
                playClick();
                onClick(movie);
            }}
            onMouseEnter={() => {
                setIsHovered(true);
            }}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "group relative bg-surface rounded-xl overflow-hidden shadow-lg cursor-pointer transform transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-2xl hover:z-20 border border-transparent hover:border-white/10 active:scale-95",
                variant === 'compact' ? "aspect-[2/3]" : ""
            )}
        >
            {/* Shimmer Effect — CSS purely */}
            <div className="absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 translate-x-[-200%] group-hover:animate-shimmer pointer-events-none" />

            <div className={cn(
                "w-full overflow-hidden relative aspect-[2/3] bg-surface-elevated",
            )}>
                <img
                    src={getPosterUrl(movie.poster_path, 'w342')}
                    srcSet={`${getPosterUrl(movie.poster_path, 'w185')} 185w, ${getPosterUrl(movie.poster_path, 'w342')} 342w, ${getPosterUrl(movie.poster_path, 'w500')} 500w`}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 250px"
                    alt={`Póster de ${movie.title}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                    width="200"
                    height="300"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

                {/* Overlays / Badges */}
                {isOscarWinner(movie.id) && <OscarBadge />}

                {/* Watched Badge */}
                {watched && (
                    <div className="absolute top-2 left-2 z-30 p-1 bg-green-500/80 backdrop-blur-md rounded-full shadow-lg border border-white/20 animate-fade-in-fast">
                        <CheckCircle size={14} className="text-white fill-green-500" />
                    </div>
                )}
            </div>

            <div className="p-3 relative z-40 bg-surface transition-colors group-hover:bg-surface-elevated">
                <h3 className="font-semibold text-white truncate text-sm md:text-base transition-colors group-hover:text-primary">
                    {movie.title}
                </h3>

                <div className="flex justify-between items-center mt-1">
                    <span className="text-secondary text-xs font-medium flex items-center gap-2">
                        <span>{year}</span>
                        {!rating && movie.vote_average > 0 && (
                            <>
                                <span className="text-white/20">•</span>
                                <span className="flex items-center gap-1 text-yellow-500/80">
                                    <Star size={10} fill="currentColor" /> {movie.vote_average.toFixed(1)}
                                </span>
                            </>
                        )}
                    </span>

                    {rating > 0 && (
                        <div className="flex items-center text-yellow-400 gap-1 bg-yellow-400/10 px-1.5 py-0.5 rounded-md">
                            <Star size={10} fill="currentColor" />
                            <span className="text-xs font-bold">{rating}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MovieCard;
