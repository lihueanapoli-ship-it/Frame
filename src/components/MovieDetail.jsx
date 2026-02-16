import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CalendarIcon, ClockIcon, ListBulletIcon, ChevronDownIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, PlusIcon, CheckIcon, StarIcon, PlayIcon, FolderIcon } from '@heroicons/react/24/solid';
import { getBackdropUrl, getPosterUrl, getMovieDetails, getMovieVideos } from '../api/tmdb';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { useLists } from '../contexts/ListContext';
import { useSound } from '../contexts/SoundContext';
import { cn } from '../lib/utils';
import { triggerConfetti, triggerSmallConfetti } from '../lib/confetti';
import AddToListModal from './ui/AddToListModal';

const MovieDetail = ({ movie: initialMovie, onClose }) => {
    const [movie, setMovie] = useState(initialMovie);
    const [showListModal, setShowListModal] = useState(false); // Legacy modal, maybe keep for "New List"?
    const [showDropdown, setShowDropdown] = useState(false);
    const [videoKey, setVideoKey] = useState(null);
    const [showVideo, setShowVideo] = useState(false);
    const [isFullVideoOpen, setIsFullVideoOpen] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);
    const dropdownRef = useRef(null);

    // Contexts
    const { addToWatched, isWatched, removeMovie, watched } = useMovies();
    const {
        addToGeneralList,
        removeFromGeneralList,
        isInGeneralList,
        myLists,
        collabLists,
        addMovieToList,
        removeMovieFromList
    } = useLists();

    const { user, loginWithGoogle } = useAuth();
    const { playSuccess, playClick } = useSound();

    // Combined Lists for Dropdown
    const allLists = [...myLists, ...collabLists].reduce((acc, current) => {
        const x = acc.find(item => item.id === current.id);
        if (!x) return acc.concat([current]);
        return acc;
    }, []);

    // Get live rating from context
    const userMovie = watched.find(m => m.id === movie.id);
    const userRating = userMovie?.rating || 0;

    // Fetch Full Details & Video
    useEffect(() => {
        const loadData = async () => {
            // 1. Fetch Full Details
            const details = await getMovieDetails(movie.id);
            if (details) {
                setMovie(prev => ({ ...prev, ...details }));
            }

            // 2. Fetch Video
            const videos = await getMovieVideos(movie.id);
            const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            const teaser = videos.find(v => v.type === 'Teaser' && v.site === 'YouTube');
            const bestVideo = trailer || teaser || videos[0];

            if (bestVideo) {
                setVideoKey(bestVideo.key);
                setTimeout(() => setShowVideo(true), 800);
            }
        };

        loadData();
    }, [movie.id]);

    // Scroll Lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Close Dropdown on Click Outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const watchedState = isWatched(movie.id);
    // Determine which list the movie is in (simplify to just checking existence for now, or finding the list ID)
    const inAnyList = allLists.find(l => l.movies?.some(m => m.id === movie.id));
    const watchlistState = !!inAnyList;

    // Handlers
    const handleMoveToWatched = async () => {
        triggerConfetti();
        playSuccess();
        addToWatched(movie, 0);
        // Remove from ALL lists it might be in? user request implies moving.
        if (inAnyList) {
            await removeMovieFromList(inAnyList.id, movie.id);
        }
    };

    const handleAddToList = async (listId) => {
        playClick();
        await addMovieToList(listId, movie);
        setShowDropdown(false);
        triggerSmallConfetti(0.5, 0.5);
    };

    const handleRemoveFromList = async () => {
        if (inAnyList) {
            await removeMovieFromList(inAnyList.id, movie.id);
        }
        setShowDropdown(false);
    };

    // UI Helpers
    const currentListName = inAnyList?.name || 'General';

    // Variants
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

            {/* Modal Container */}
            <motion.div
                variants={sheetVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative w-full max-w-6xl mx-auto bg-background rounded-t-xl sm:rounded-xl overflow-hidden shadow-2xl h-[90vh] flex flex-col border border-white/10"
            >
                {/* Close Button (Fixed relative to Container) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[70] p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-colors cursor-pointer shadow-lg border border-white/10"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain relative">

                    {/* Cinematic Header (Clickable for Full Video) */}
                    <div
                        className={cn(
                            "relative h-[30vh] sm:h-[50vh] w-full bg-black overflow-hidden group",
                            videoKey && showVideo ? "cursor-pointer" : ""
                        )}
                        onClick={() => {
                            if (videoKey && showVideo) {
                                setIsFullVideoOpen(true);
                            }
                        }}
                    >
                        {/* 1. Backdrop Image */}
                        <div className={cn(
                            "absolute inset-0 transition-opacity duration-1000",
                            showVideo ? "opacity-0" : "opacity-100"
                        )}>
                            <img
                                src={getBackdropUrl(movie.backdrop_path) || getPosterUrl(movie.poster_path)}
                                alt={movie.title}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* 2. Youtube Trailer */}
                        {videoKey && (
                            <div className={cn(
                                "absolute inset-0 transition-opacity duration-1000 pointer-events-none",
                                showVideo ? "opacity-100" : "opacity-0"
                            )}>
                                <iframe
                                    title="Trailer Background"
                                    src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${videoKey}&start=10`}
                                    className="w-full h-[140%] -mt-[10%] scale-150 opacity-60"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                />
                            </div>
                        )}

                        {/* 3. Play Button */}
                        {videoKey && showVideo && (
                            <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-white/20 backdrop-blur-md border border-white/30 p-5 rounded-full shadow-2xl transform group-hover:scale-110 transition-transform">
                                    <PlayIcon className="w-10 h-10 text-white fill-white" />
                                </div>
                                <span className="absolute mt-24 text-white font-medium text-sm tracking-wider opacity-90 drop-shadow-md">VER TRAILER</span>
                            </div>
                        )}

                        {/* 4. Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />

                        {/* Title & Stats */}
                        <div className="absolute bottom-0 left-0 p-6 sm:p-10 w-full z-10 pointer-events-none">
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-4xl sm:text-6xl font-bold text-white mb-3 leading-tight drop-shadow-xl font-display"
                            >
                                {movie.title}
                            </motion.h2>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="flex flex-wrap gap-4 text-sm font-medium text-gray-200"
                            >
                                {movie.release_date && (
                                    <span className="flex items-center gap-1.5 backdrop-blur-sm bg-black/30 px-3 py-1.5 rounded-lg border border-white/5"><CalendarIcon className="w-4 h-4" /> {movie.release_date.split('-')[0]}</span>
                                )}
                                {movie.runtime > 0 && (
                                    <span className="flex items-center gap-1.5 backdrop-blur-sm bg-black/30 px-3 py-1.5 rounded-lg border border-white/5"><ClockIcon className="w-4 h-4" /> {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                                )}
                                {movie.vote_average > 0 && (
                                    <span className="flex items-center gap-1.5 text-yellow-400 backdrop-blur-sm bg-black/30 px-3 py-1.5 rounded-lg border border-white/5"><StarIconSolid className="w-4 h-4" /> {movie.vote_average.toFixed(1)}</span>
                                )}
                            </motion.div>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="flex flex-col pb-24">
                        <div className="p-6 sm:p-10 space-y-8">
                            <div className="max-w-4xl">
                                <h3 className="text-xl font-bold text-white mb-3">Sinopsis</h3>
                                <p className="text-gray-300 leading-relaxed text-lg font-light">
                                    {movie.overview || "No hay descripción disponible."}
                                </p>
                            </div>

                            {/* Genres */}
                            {movie.genres && (
                                <div className="flex flex-wrap gap-2">
                                    {movie.genres.map(g => (
                                        <span key={g.id} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
                                            {g.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Cast */}
                            {movie.credits?.cast?.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4">Elenco Principal</h3>
                                    <div className="flex gap-4 overflow-x-auto pb-6 hide-scrollbar">
                                        {movie.credits.cast.slice(0, 10).map(actor => (
                                            <div key={actor.id} className="w-28 flex-shrink-0 text-center group">
                                                <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden bg-surface-elevated border border-white/5 group-hover:border-primary/50 transition-colors">
                                                    {actor.profile_path ? (
                                                        <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} className="w-full h-full object-cover" alt={actor.name} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">N/A</div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-white font-medium truncate">{actor.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{actor.character}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions Sticky Footer (Inside Flex Col) */}
                <div className="p-4 bg-surface-elevated/95 backdrop-blur-xl border-t border-white/10 z-50">
                    {!watchedState && !watchlistState && (
                        <div className="flex gap-3 max-w-4xl mx-auto">
                            {/* ADD BUTTON WITH DROPDOWN */}
                            <div className="relative flex-1 group" ref={dropdownRef}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!user) { loginWithGoogle(); return; }
                                        setShowDropdown(!showDropdown);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-all border border-white/10 backdrop-blur-md"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span>Quiero verla</span>
                                    <ChevronDownIcon className="w-4 h-4 ml-1 opacity-70" />
                                </button>

                                {/* Dropdown Menu */}
                                {showDropdown && (
                                    <div className="absolute bottom-full left-0 w-full mb-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in z-[80]">
                                        <div className="p-2 max-h-48 overflow-y-auto">
                                            {allLists.map(list => (
                                                <button
                                                    key={list.id}
                                                    onClick={() => handleAddToList(list.id)}
                                                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 text-sm font-medium text-gray-200 hover:text-white flex items-center gap-3 transition-colors"
                                                >
                                                    <span className="text-lg">{list.name === 'General' ? '🎬' : '📑'}</span>
                                                    {list.name}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => { setShowListModal(true); setShowDropdown(false); }}
                                                className="w-full text-left px-4 py-3 rounded-lg hover:bg-primary/20 text-sm font-bold text-primary flex items-center gap-3"
                                            >
                                                <PlusIcon className="w-4 h-4" /> Crear nueva lista...
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!user) { loginWithGoogle(); return; }
                                    triggerConfetti();
                                    playSuccess();
                                    addToWatched(movie, 0);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-white text-black font-bold hover:bg-gray-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
                            >
                                <CheckIcon className="w-5 h-5" />
                                <span>Ya la vi</span>
                            </button>
                        </div>
                    )}

                    {watchlistState && (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <ListBulletIcon className="w-6 h-6" />
                                    </div>
                                    <div className="relative" ref={dropdownRef}>
                                        <p className="text-xs text-gray-400">En tu lista</p>
                                        <button
                                            onClick={() => setShowDropdown(!showDropdown)}
                                            className="text-sm font-bold text-white flex items-center gap-1 hover:text-primary transition-colors"
                                        >
                                            {currentListName} <ChevronDownIcon className="w-3 h-3" />
                                        </button>

                                        {/* Movable Dropdown */}
                                        {showDropdown && (
                                            <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[80]">
                                                <div className="p-2">
                                                    <p className="px-3 py-2 text-xs font-bold text-gray-500 uppercase">Mover a...</p>
                                                    {allLists.filter(l => l.name !== currentListName).map(list => (
                                                        <button
                                                            key={list.id}
                                                            onClick={async () => {
                                                                if (inAnyList) await removeMovieFromList(inAnyList.id, movie.id);
                                                                await addMovieToList(list.id, movie);
                                                                setShowDropdown(false);
                                                                triggerSmallConfetti(0.5, 0.5);
                                                            }}
                                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-300 hover:text-white flex items-center gap-2"
                                                        >
                                                            <span>{list.name === 'General' ? '🎬' : '📑'}</span> {list.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFromList();
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                                >
                                    Quitar
                                </button>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToWatched();
                                }}
                                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/40 active:scale-95"
                            >
                                <CheckIcon className="w-6 h-6" />
                                <span className="text-lg tracking-wide">Marcar como Vista</span>
                            </button>
                        </div>
                    )}

                    {watchedState && (
                        <div className="space-y-4 max-w-4xl mx-auto">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-mono text-gray-400 uppercase tracking-widest">Tu Calificación</span>
                                <button onClick={() => { removeMovie(movie.id); onClose(); }} className="text-xs text-red-500 hover:text-red-400 font-mono tracking-wide opacity-70 hover:opacity-100 transition-opacity">ELIMINAR</button>
                            </div>

                            <div className="flex justify-between items-center px-1" onMouseLeave={() => setHoverRating(0)}>
                                {Array.from({ length: 10 }, (_, i) => i + 1).map(star => {
                                    const isActive = (hoverRating || userRating) >= star;
                                    return (
                                        <button key={star} onMouseEnter={() => setHoverRating(star)} onClick={() => addToWatched(movie, star)} className="group p-1 transition-transform hover:scale-125 focus:outline-none">
                                            {isActive ? <StarIconSolid className={cn("w-6 h-6 sm:w-8 sm:h-8 transition-colors duration-200", star <= 4 ? "text-red-500" : star <= 7 ? "text-yellow-500" : "text-primary")} /> : <StarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700 group-hover:text-gray-500 transition-colors" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {isFullVideoOpen && videoKey && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex flex-col justify-center items-center"
                    >
                        <button
                            onClick={() => setIsFullVideoOpen(false)}
                            className="absolute top-6 right-6 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all transform hover:scale-110"
                        >
                            <XMarkIcon className="w-8 h-8" />
                        </button>

                        <div className="w-full h-full max-w-7xl max-h-screen aspect-video relative">
                            <iframe
                                title="Trailer Fullscreen"
                                src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0&showinfo=0`}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                allowFullScreen
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AddToListModal isOpen={showListModal} onClose={() => setShowListModal(false)} movie={movie} />
        </div>
    );
};

export default MovieDetail;
