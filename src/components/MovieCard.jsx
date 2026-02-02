import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPosterUrl, getBackdropUrl } from '../api/tmdb';
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { ClockIcon } from '@heroicons/react/24/outline'; // Reloj
import { CheckIcon, PlusIcon } from '@heroicons/react/24/solid'; // Icons for actions
import { useSound } from '../contexts/SoundContext';
import OscarBadge from './badges/OscarBadge';
import { isOscarWinner } from '../constants/oscarWinners';

const MovieCard = ({ movie, onClick, rating, variant = 'default', onAddToWatchlist, onMarkWatched }) => { // Added action props placeholders
    const [isHovered, setIsHovered] = useState(false);
    const { playHover, playClick } = useSound();

    // --- VARIANT LOGIC (REMOVED as per cleanup request) ---
    // Standardized card appearance

    // --- METADATA HELPERS ---
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

    return (
        <motion.div
            layout // Enable layout animation for smooth sorting/filtering
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onHoverStart={() => {
                setIsHovered(true);
            }}
            onHoverEnd={() => setIsHovered(false)}
            onClick={() => {
                playClick();
                onClick(movie);
            }}
            className={cn(
                "group relative bg-surface rounded-xl overflow-hidden shadow-lg cursor-pointer",
                // Base transform handled by Framer Motion now
                "border border-transparent" // Base border
            )}
            whileHover={{
                scale: 1.05,
                y: -5,
                boxShadow: "0 10px 30px -10px rgba(0, 240, 255, 0.3)" // Cyan shadow on lift
            }}
        >
            {/* Shimmer Effect on Hover */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{ x: "200%", opacity: [0, 0.5, 0] }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="absolute inset-0 z-20 bg-gradient-to-r from-transparent via-primary/20 to-transparent skew-x-12 pointer-events-none"
                    />
                )}
            </AnimatePresence>

            {/* Visual Aspect: Poster vs Backdrop */}
            <div className={cn(
                "w-full overflow-hidden relative aspect-[2/3]", // Force portrait aspect ratio always
            )}>

                <motion.img
                    src={getPosterUrl(movie.poster_path)} // Always use poster
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

                {/* Overlays / Badges */}
                {isOscarWinner(movie.id) && <OscarBadge />}

                {/* Quick Actions - Slide Up on Hover */}
                <div className="absolute bottom-0 left-0 right-0 p-3 z-30 flex gap-2 justify-center pb-safe overflow-hidden pointer-events-none">
                    <AnimatePresence>
                        {isHovered && (
                            <motion.div
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "100%", opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="flex gap-2 w-full pointer-events-auto"
                            >
                                {/* Future actions */}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="p-3 relative z-10 bg-surface">
                <h3 className="font-semibold text-white truncate text-sm md:text-base transition-colors group-hover:text-primary">
                    {movie.title}
                </h3>

                <div className="flex justify-between items-center mt-1">
                    <span className="text-secondary text-xs font-medium">
                        {year}
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
