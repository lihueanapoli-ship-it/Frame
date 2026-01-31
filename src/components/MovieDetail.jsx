import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, StarIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, PlusIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/solid';
import { getBackdropUrl, getPosterUrl, getMovieDetails } from '../api/tmdb';
import { useMovies } from '../contexts/MovieContext';
import { cn } from '../lib/utils';

const MovieDetail = ({ movie: initialMovie, onClose }) => {
    const [movie, setMovie] = useState(initialMovie);
    const { addToWatchlist, addToWatched, removeMovie, isWatched, isInWatchlist, moveFromWatchlistToWatched } = useMovies();

    // Fetch complete details including cast
    useEffect(() => {
        const fetchFullDetails = async () => {
            if (initialMovie.id) {
                const data = await getMovieDetails(initialMovie.id);
                if (data) setMovie(data);
            }
        };
        fetchFullDetails();
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
        exit: { y: "100%" }
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
                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8">

                    {/* Main Info */}
                    <div className="space-y-6">
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

                    {/* Actions Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-surface-elevated p-5 rounded-2xl border border-white/5 space-y-3 sticky top-4">
                            <h3 className="text-white font-semibold mb-1">Tu Estado</h3>

                            {/* Logic for buttons */}
                            {!watchedState && !watchlistState && (
                                <>
                                    <button
                                        onClick={() => addToWatchlist(movie)}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-all border border-white/5"
                                    >
                                        <PlusIcon className="w-5 h-5" /> Por Ver
                                    </button>
                                    <button
                                        onClick={() => addToWatched(movie, 0)}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black hover:bg-gray-200 font-bold transition-all"
                                    >
                                        <CheckIcon className="w-5 h-5" /> Ya la vi
                                    </button>
                                </>
                            )}

                            {watchlistState && (
                                <>
                                    <div className="p-3 bg-primary/20 border border-primary/50 rounded-lg text-primary text-center text-sm font-medium mb-2">
                                        En tu lista "Por Ver"
                                    </div>
                                    <button
                                        onClick={() => moveFromWatchlistToWatched(movie.id)}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white hover:bg-primary-hover font-bold transition-all shadow-lg shadow-primary/20"
                                    >
                                        <CheckIcon className="w-5 h-5" /> Marcar como Vista
                                    </button>
                                    <button
                                        onClick={() => { removeMovie(movie.id); onClose(); }}
                                        className="w-full py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Eliminar de lista
                                    </button>
                                </>
                            )}

                            {watchedState && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-gray-400">Tu calificación</span>
                                        <span className="text-lg font-bold text-yellow-500">{movie.rating || 0}</span>
                                    </div>
                                    <div className="flex justify-between mb-4">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                onClick={() => addToWatched(movie, star)}
                                                className={cn(
                                                    "p-1 transition-transform hover:scale-110",
                                                    (movie.rating >= star) ? "text-yellow-500" : "text-gray-700"
                                                )}
                                            >
                                                {movie.rating >= star ? <StarIconSolid className="w-6 h-6" /> : <StarIcon className="w-6 h-6" />}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => { removeMovie(movie.id); onClose(); }} className="w-full flex items-center justify-center gap-2 text-red-500 text-sm py-2 hover:bg-red-500/10 rounded-lg transition-colors">
                                        <TrashIcon className="w-4 h-4" /> Eliminar registro
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default MovieDetail;
