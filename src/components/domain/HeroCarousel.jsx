import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBackdropUrl, getPosterUrl, getGenreNames } from '../../api/tmdb';
import { PlusIcon } from '@heroicons/react/24/outline';

const HeroCarousel = ({ movies, onSelectMovie }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-rotate
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % Math.min(movies.length, 5)); // Limit to top 5
        }, 8000);
        return () => clearInterval(timer);
    }, [movies]);

    if (!movies || movies.length === 0) return null;

    const movie = movies[currentIndex];

    return (
        <div
            onClick={() => onSelectMovie(movie)}
            className="relative w-full aspect-[4/5] md:aspect-[21/9] overflow-hidden rounded-b-3xl md:rounded-3xl shadow-2xl bg-surface cursor-pointer group"
        >
            <AnimatePresence mode='wait'>
                <motion.div
                    key={movie.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                >
                    <img
                        src={getBackdropUrl(movie.poster_path, 'w1280')}  // Using poster for mobile vertical ratio mostly, but let's check
                        srcSet={`${getPosterUrl(movie.poster_path, 'w780')} 768w, ${getBackdropUrl(movie.backdrop_path, 'w1280')} 1024w`}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                    />
                    {/* Cinematic Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
                </motion.div>
            </AnimatePresence>

            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-30">
                <motion.div
                    key={`text-${movie.id}`}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <span className="inline-block px-3 py-1 mb-3 text-xs font-bold tracking-wider text-primary uppercase bg-primary/10 rounded-full border border-primary/20 backdrop-blur-md">
                        {getGenreNames(movie.genre_ids).slice(0, 3).join(', ') || 'Tendencia Global'}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight max-w-xl">
                        {movie.title}
                    </h2>
                    <p className="text-gray-300 line-clamp-2 max-w-lg mb-6 text-sm md:text-base">
                        {movie.overview}
                    </p>


                </motion.div>
            </div>
        </div>
    );
};

export default HeroCarousel;
