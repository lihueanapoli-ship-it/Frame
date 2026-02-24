import React, { useRef, useState, useEffect } from 'react';
import { getBackdropUrl, getPosterUrl, getGenreNames } from '../../api/tmdb';

const MAX_SLIDES = 5;

const HeroCarousel = ({ movies, onSelectMovie }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const touchStartX = useRef(null);
    const autoRotateRef = useRef(null);

    const total = Math.min(movies?.length || 0, MAX_SLIDES);

    const goTo = (idx) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentIndex(idx);
        setTimeout(() => setIsTransitioning(false), 600);
    };

    const goNext = () => goTo((currentIndex + 1) % total);
    const goPrev = () => goTo((currentIndex - 1 + total) % total);

    const resetTimer = () => {
        clearInterval(autoRotateRef.current);
        autoRotateRef.current = setInterval(goNext, 8000);
    };

    useEffect(() => {
        if (!movies?.length) return;
        autoRotateRef.current = setInterval(goNext, 8000);
        return () => clearInterval(autoRotateRef.current);
    }, [movies, currentIndex]);

    const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 30) {
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
            className="relative w-full aspect-[3/4] sm:aspect-[16/7] overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl bg-surface cursor-pointer group touch-auto"
        >
            {/* CSS-based crossfade — no framer-motion needed */}
            {movies.slice(0, total).map((m, i) => (
                <div
                    key={m.id}
                    className="absolute inset-0"
                    style={{
                        opacity: i === currentIndex ? 1 : 0,
                        transition: 'opacity 0.8s ease-in-out',
                        willChange: 'opacity',
                    }}
                    aria-hidden={i !== currentIndex}
                >
                    <img
                        src={getBackdropUrl(m.backdrop_path, 'w780')}
                        srcSet={`${getBackdropUrl(m.backdrop_path, 'w780')} 780w, ${getBackdropUrl(m.backdrop_path, 'w1280')} 1280w`}
                        sizes="(max-width: 768px) 780px, 1280px"
                        alt={`Póster de ${m.title}`}
                        className="w-full h-full object-cover"
                        loading={i === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchPriority={i === 0 ? 'high' : 'low'}
                        width="1280"
                        height="720"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
                </div>
            ))}

            {/* Content — CSS animation only */}
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-12 z-30">
                <div
                    key={`text-${movie.id}`}
                    style={{ animation: 'heroFadeUp 0.5s ease-out 0.2s both' }}
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
                </div>
            </div>

            {/* Slide indicators */}
            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex gap-1.5 z-30" onClick={e => e.stopPropagation()}>
                {Array.from({ length: total }).map((_, i) => (
                    <button
                        key={i}
                        aria-label={`Ir a película ${i + 1}`}
                        onClick={(e) => { e.stopPropagation(); resetTimer(); goTo(i); }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/30'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroCarousel;
