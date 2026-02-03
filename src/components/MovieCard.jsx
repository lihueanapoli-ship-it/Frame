import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPosterUrl, getBackdropUrl, getMovieVideos } from '../api/tmdb';
// ... (keep other imports)

const MovieCard = ({ movie, onClick, rating, variant = 'default', onAddToWatchlist, onMarkWatched }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [videoKey, setVideoKey] = useState(null);
    const [showVideo, setShowVideo] = useState(false);
    const { playHover, playClick } = useSound();

    // Cinematic Hover Logic
    React.useEffect(() => {
        let timer;
        if (isHovered) {
            timer = setTimeout(async () => {
                // Only fetch if we haven't already and no video is showing
                if (!videoKey) {
                    const videos = await getMovieVideos(movie.id);
                    // Prioritize Official Trailers
                    const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
                        || videos.find(v => v.site === 'YouTube' && v.type === 'Teaser');

                    if (trailer) {
                        setVideoKey(trailer.key);
                        setShowVideo(true);
                    }
                } else {
                    setShowVideo(true);
                }
            }, 1000); // 1s delay to avoid spamming while scrolling
        } else {
            setShowVideo(false);
        }
        return () => clearTimeout(timer);
    }, [isHovered, movie.id, videoKey]);

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
                playHover();
            }}
            onHoverEnd={() => {
                setIsHovered(false);
                setShowVideo(false);
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
            {/* ... Shimmer (keep existing) ... */}
            <AnimatePresence>
                {isHovered && !showVideo && (
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
                {/* Video Overlay */}
                <AnimatePresence>
                    {showVideo && videoKey && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 bg-black"
                        >
                            <iframe
                                title="Trailer Preview"
                                src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${videoKey}&start=10`}
                                className="w-full h-full scale-[1.35] pointer-events-none" // Scale up to remove black bars/controls
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                            {/* Gradient to ensure text readability over video */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.img
                    src={getPosterUrl(movie.poster_path)} // Always use poster
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

                {/* Overlays / Badges (Existing) */}
                {isOscarWinner(movie.id) && <OscarBadge />}

                {/* ... existing hover actions ... */}
            </div>

            <div className="p-3 relative z-40 bg-surface transition-colors group-hover:bg-surface-elevated">
                <h3 className="font-semibold text-white truncate text-sm md:text-base transition-colors group-hover:text-primary">
                    {movie.title}
                </h3>
                {/* ... existing footer ... */}
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
