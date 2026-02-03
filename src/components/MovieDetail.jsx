import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, StarIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, PlusIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/solid';
import { getBackdropUrl, getPosterUrl, getMovieDetails } from '../api/tmdb';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { useSound } from '../contexts/SoundContext';
import { cn } from '../lib/utils';
import { triggerConfetti, triggerSmallConfetti } from '../lib/confetti';

const MovieDetail = ({ movie: initialMovie, onClose }) => {
    const [movie, setMovie] = useState(initialMovie);
    const [hoverRating, setHoverRating] = useState(0);
    const { addToWatchlist, addToWatched, removeMovie, isWatched, isInWatchlist, moveFromWatchlistToWatched, watched } = useMovies();
    const { user, loginWithGoogle } = useAuth();
    const { playSuccess, playClick } = useSound();

    // Get live rating from context
    const userMovie = watched.find(m => m.id === movie.id);
    const userRating = userMovie?.rating || 0;

    // Fetch complete details including cast
    useEffect(() => {
        const fetchFullDetails = async () => {
            if (initialMovie.id) {
                const data = await getMovieDetails(initialMovie.id);
                if (data) setMovie(data);
            }
        };
        fetchFullDetails();

        // Lock body scroll to prevent background bounce
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [initialMovie.id]);

    const watchedState = isWatched(movie.id);
    const watchlistState = isInWatchlist(movie.id);

    // Animation Variants
    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 }
    };

    const sheetVariants = {
        hidden: { y: "100%" },
        visible: { y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
        exit: { y: "100%", transition: { type: "tween", ease: "easeInOut", duration: 0.3 } }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
            {/* Backdrop */}
            <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Sheet / Modal */}
            <motion.div
                variants={sheetVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative w-full max-w-4xl bg-background rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Hero Header */}
                <div className="relative h-[40vh] sm:h-[50vh] w-full">
                    <img
                        src={getBackdropUrl(movie.backdrop_path) || getPosterUrl(movie.poster_path)}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

                    <div className="absolute bottom-0 left-0 p-6 sm:p-8 w-full">
                        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-2 leading-tight drop-shadow-lg">
                            {movie.title}
                        </h2>
                        <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-300">
                            {movie.release_date && (
                                <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> {movie.release_date.split('-')[0]}</span>
                            )}
                            {movie.runtime > 0 && (
                                <span className="flex items-center gap-1.5"><ClockIcon className="w-4 h-4" /> {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                            )}
                            {movie.vote_average > 0 && (
                                <span className="flex items-center gap-1.5 text-yellow-500"><StarIconSolid className="w-4 h-4" /> {movie.vote_average.toFixed(1)}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col pb-safe">
                    {/* Main Info */}
                    <div className="p-6 sm:p-8 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Sinopsis</h3>
                            <p className="text-gray-400 leading-relaxed text-base sm:text-lg">
                                {movie.overview || "No hay descripción disponible."}
                            </p>
                        </div>

                        {/* Genes */}
                        {movie.genres && (
                            <div className="flex flex-wrap gap-2">
                                {movie.genres.map(g => (
                                    <span key={g.id} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
                                        {g.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Cast Scroll */}
                        {movie.credits?.cast?.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-white mb-3">Elenco</h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                                    {movie.credits.cast.slice(0, 10).map(actor => (
                                        <div key={actor.id} className="w-24 flex-shrink-0 text-center">
                                            <div className="w-20 h-20 mx-auto mb-2 rounded-full overflow-hidden bg-surface-elevated">
                                                {actor.profile_path ? (
                                                    <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} className="w-full h-full object-cover" alt={actor.name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">N/A</div>
                                                )}
                                            </div>
                                            <p className="text-xs text-white font-medium truncate">{actor.name}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{actor.character}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions Sticky Footer */}
                    <div className="sticky bottom-0 left-0 right-0 p-4 bg-surface-elevated border-t border-white/5 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                        {/* Logic for buttons */}
                        {!watchedState && !watchlistState && (
                            <div className="flex gap-3">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!user) { loginWithGoogle(); return; }
                                        // Confetti + Sound
                                        playClick();
                                        const rect = e.target.getBoundingClientRect();
                                        triggerSmallConfetti(
                                            (rect.left + rect.width / 2) / window.innerWidth,
                                            (rect.top + rect.height / 2) / window.innerHeight
                                        );
                                        addToWatchlist(movie);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 backdrop-blur-md cursor-pointer active:scale-95 group"
                                >
                                    <PlusIcon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                                    <span className="tracking-wide">Quiero verla</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!user) { loginWithGoogle(); return; }
                                        triggerConfetti();
                                        playSuccess();
                                        addToWatched(movie, 0);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-white to-gray-200 hover:to-gray-100 text-black font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] cursor-pointer active:scale-95"
                                >
                                    <CheckIcon className="w-5 h-5" />
                                    <span className="tracking-wide">Ya la vi</span>
                                </button>
                            </div>
                        )}

                        {watchlistState && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-sm text-primary font-medium tracking-wide">Agregada a tu lista</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeMovie(movie.id);
                                            onClose();
                                        }}
                                        className="text-xs text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-full transition-colors"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        triggerConfetti();
                                        playSuccess();
                                        moveFromWatchlistToWatched(movie.id);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 cursor-pointer active:scale-95"
                                >
                                    <CheckIcon className="w-5 h-5" />
                                    <span className="tracking-wide">Marcar como Vista</span>
                                </button>
                            </div>
                        )}

                        {watchedState && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-mono text-gray-400 uppercase tracking-widest">Tu Calificación</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeMovie(movie.id);
                                            onClose();
                                        }}
                                        className="text-xs text-red-500 hover:text-red-400 font-mono tracking-wide opacity-70 hover:opacity-100 transition-opacity"
                                    >
                                        ELIMINAR
                                    </button>
                                </div>

                                {/* Star Rating Row */}
                                <div
                                    className="flex justify-between items-center px-1"
                                    onMouseLeave={() => setHoverRating(0)}
                                >
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map(star => {
                                        const isActive = (hoverRating || userRating) >= star;
                                        return (
                                            <button
                                                key={star}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!user) { loginWithGoogle(); return; }
                                                    triggerConfetti();
                                                    playSuccess();
                                                    addToWatched(movie, star);
                                                }}
                                                className="group p-1 sm:p-1.5 transition-transform hover:scale-125 focus:outline-none"
                                            >
                                                {isActive ? (
                                                    <StarIconSolid className={cn(
                                                        "w-6 h-6 sm:w-8 sm:h-8 transition-colors duration-200",
                                                        star <= 4 ? "text-red-500" :
                                                            star <= 7 ? "text-yellow-500" :
                                                                "text-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                                                    )} />
                                                ) : (
                                                    <StarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700 group-hover:text-gray-500 transition-colors" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* ... rest of the file ... */}
                                <div className="h-8 flex flex-col items-center justify-center">
                                    {(hoverRating || userRating) > 0 ? (
                                        <motion.div
                                            key={hoverRating || userRating}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-center"
                                        >
                                            <span className={cn(
                                                "font-display text-lg font-bold tracking-wide",
                                                (hoverRating || userRating) <= 4 ? "text-red-400" :
                                                    (hoverRating || userRating) <= 7 ? "text-yellow-400" :
                                                        "text-primary"
                                            )}>
                                                {(hoverRating || userRating)}/10 • {
                                                    (hoverRating || userRating) === 1 ? "Horrible" :
                                                        (hoverRating || userRating) === 2 ? "Muy mala" :
                                                            (hoverRating || userRating) === 3 ? "Mala" :
                                                                (hoverRating || userRating) === 4 ? "Por debajo del promedio" :
                                                                    (hoverRating || userRating) === 5 ? "Regular" :
                                                                        (hoverRating || userRating) === 6 ? "Decente" :
                                                                            (hoverRating || userRating) === 7 ? "Buena" :
                                                                                (hoverRating || userRating) === 8 ? "Muy buena" :
                                                                                    (hoverRating || userRating) === 9 ? "Excelente" :
                                                                                        "Obra maestra"
                                                }
                                            </span>
                                        </motion.div>
                                    ) : (
                                        <span className="text-xs text-gray-600 font-mono">
                                            Toca las estrellas para calificar
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default MovieDetail;
