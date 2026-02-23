import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBackdropUrl, getPosterUrl, getGenreNames } from '../../api/tmdb';

const MAX_SLIDES = 5;

const HeroCarousel = ({ movies, onSelectMovie }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const touchStartX = useRef(null);
    const autoRotateRef = useRef(null);

    const total = Math.min(movies?.length || 0, MAX_SLIDES);

    const goNext = () => setCurrentIndex(prev => (prev + 1) % total);
    const goPrev = () => setCurrentIndex(prev => (prev - 1 + total) % total);

    // Auto-rotate
    const resetTimer = () => {
        clearInterval(autoRotateRef.current);
        autoRotateRef.current = setInterval(goNext, 8000);
    };

    useEffect(() => {
        if (!movies?.length) return;
        autoRotateRef.current = setInterval(goNext, 8000);
        return () => clearInterval(autoRotateRef.current);
    }, [movies]);

    // Touch swipe handlers
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 48) {
            resetTimer();
            diff > 0 ? goNext() : goPrev();
        }
        touchStartX.current = null;
    };

    if (!movies || movies.length === 0) return null;

    const movie = movies[currentIndex];

    return (
        <div
            onClick={() => onSelectMovie(movie)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative w-full aspect-[3/4] sm:aspect-[16/7] overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl bg-surface cursor-pointer group"
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
                        src={getBackdropUrl(movie.poster_path, 'w1280')}
                        srcSet={`${getPosterUrl(movie.poster_path, 'w780')} 768w, ${getBackdropUrl(movie.backdrop_path, 'w1280')} 1024w`}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                    />
                    {/* Cinematic Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
                </motion.div>
            </AnimatePresence>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-12 z-30">
                <motion.div
                    key={`text-${movie.id}`}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <span className="inline-block px-3 py-1 mb-2 md:mb-3 text-[10px] md:text-xs font-bold tracking-wider text-primary uppercase bg-primary/10 rounded-full border border-primary/20 backdrop-blur-md">
                        {getGenreNames(movie.genre_ids).slice(0, 3).join(', ') || 'Tendencia Global'}
                    </span>
                    <h2 className="text-2xl md:text-5xl font-bold text-white mb-2 leading-tight max-w-xl">
                        {movie.title}
                    </h2>
                    <p className="text-gray-300 line-clamp-2 max-w-lg mb-4 text-xs md:text-base hidden sm:block">
                        {movie.overview}
                    </p>
                </motion.div>
            </div>

            {/* Slide indicators */}
            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex gap-1.5 z-30" onClick={e => e.stopPropagation()}>
                {Array.from({ length: total }).map((_, i) => (
                    <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); resetTimer(); setCurrentIndex(i); }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/30'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroCarousel;
