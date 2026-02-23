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
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onHoverStart={() => {
                setIsHovered(true);
            }}
            onHoverEnd={() => {
                setIsHovered(false);
            }}
            onClick={() => {
                playClick();
                onClick(movie);
            }}
            className={cn(
                "group relative bg-surface rounded-xl overflow-hidden shadow-lg cursor-pointer transform-gpu",
                "border border-transparent hover:border-white/10"
            )}
            whileHover={{
                scale: 1.05,
                y: -5,
                boxShadow: "0 15px 30px -10px rgba(0, 0, 0, 0.5)",
                zIndex: 20
            }}
        >
            {/* Shimmer Effect */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{ x: "200%", opacity: [0, 0.5, 0] }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
                    />
                )}
            </AnimatePresence>

            <div className={cn(
                "w-full overflow-hidden relative aspect-[2/3] bg-surface-elevated",
            )}>
                <motion.img
                    src={getPosterUrl(movie.poster_path)}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

                {/* Overlays / Badges */}
                {isOscarWinner(movie.id) && <OscarBadge />}

                {/* Watched Badge */}
                {watched && (
                    <div className="absolute top-2 left-2 z-30 p-1 bg-green-500/80 backdrop-blur-md rounded-full shadow-lg border border-white/20">
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
        </motion.div>
    );
};

export default MovieCard;
