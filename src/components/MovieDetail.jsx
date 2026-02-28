import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CalendarIcon, ClockIcon, ListBulletIcon, ChevronDownIcon, EllipsisHorizontalIcon, UserGroupIcon, TrashIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, PlusIcon, CheckIcon, StarIcon, PlayIcon, FolderIcon } from '@heroicons/react/24/solid';
import { getBackdropUrl, getPosterUrl, getMovieDetails, getMovieVideos, getWatchProviders } from '../api/tmdb';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { useLists } from '../contexts/ListContext';
import { useSound } from '../contexts/SoundContext';
import { cn } from '../lib/utils';
import { triggerConfetti, triggerSmallConfetti } from '../lib/confetti';
import AddToListModal from './ui/AddToListModal';
import ShareWithFriendModal from './ui/ShareWithFriendModal';

const MovieDetail = ({ movie: initialMovie, onClose }) => {
    const [movie, setMovie] = useState(initialMovie);
    const [showListModal, setShowListModal] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [videoKey, setVideoKey] = useState(null);
    const [showVideo, setShowVideo] = useState(false);
    const [isFullVideoOpen, setIsFullVideoOpen] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);
    const [showShareFriend, setShowShareFriend] = useState(false);
    const [watchProviders, setWatchProviders] = useState(null);
    const dropdownRef = useRef(null);

    const { addToWatched, isWatched, removeMovie, watched } = useMovies();
    const {
        addToGeneralList,
        removeFromGeneralList,
        isInGeneralList,
        myLists,
        collabLists,
        addMovieToList,
        removeMovieFromList,
        setMovieWatchedInList
    } = useLists();

    const { user, loginWithGoogle } = useAuth();
    const { playSuccess, playClick } = useSound();

    const allLists = [...myLists, ...collabLists].reduce((acc, current) => {
        const x = acc.find(item => item.id === current.id);
        if (!x) return acc.concat([current]);
        return acc;
    }, []);

    const userMovie = watched.find(m => m.id === movie.id);
    const userRating = userMovie?.rating || 0;

    useEffect(() => {
        const loadData = async () => {
            const details = await getMovieDetails(movie.id);
            if (details) {
                setMovie(prev => ({ ...prev, ...details }));
            }

            const videos = await getMovieVideos(movie.id);
            const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            const teaser = videos.find(v => v.type === 'Teaser' && v.site === 'YouTube');
            const bestVideo = trailer || teaser || videos[0];
            if (bestVideo) {
                setVideoKey(bestVideo.key);
                setTimeout(() => setShowVideo(true), 800);
            }

            const providers = await getWatchProviders(movie.id);
            setWatchProviders(providers);
        };

        loadData();
    }, [movie.id]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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
    const inAnyList = allLists.find(l => l.movies?.some(m => m.id === movie.id));
    const watchlistState = !!inAnyList;

    const handleMoveToWatched = async () => {
        triggerConfetti();
        playSuccess();
        addToWatched(movie, 0);

        if (inAnyList) {
            await setMovieWatchedInList(inAnyList.id, movie.id, true);
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

    const currentListName = inAnyList?.name || 'General';

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

    const getDirectStreamingLink = (providerName, movieTitle) => {
        const name = providerName.toLowerCase();
        const query = encodeURIComponent(movieTitle);

        if (name.includes('netflix')) return `https://www.netflix.com/search?q=${query}`;
        if (name.includes('disney')) return `https://www.disneyplus.com/search?q=${query}`;
        if (name.includes('amazon') || name.includes('prime')) return `https://www.amazon.com/s?k=${query}&i=instant-video`;
        if (name.includes('hbo') || name.includes('max')) return `https://www.max.com/search/${query}`;
        if (name.includes('apple')) return `https://tv.apple.com/search?term=${query}`;
        if (name.includes('google')) return `https://play.google.com/store/search?q=${query}&c=movies`;

        return `https://www.google.com/search?q=ver+${query}+en+${encodeURIComponent(providerName)}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            <motion.div
                variants={sheetVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative w-full max-w-7xl bg-[#0F0F0F] rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] h-[92vh] sm:h-[94vh] flex flex-col border border-white/10"
            >
                {!isFullVideoOpen && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-[110] p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-colors cursor-pointer shadow-lg border border-white/10 pointer-events-auto"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                )}

                <div className="flex-1 overflow-y-auto overscroll-contain relative">

                    <div
                        className={cn(
                            "relative h-[40vh] sm:h-[60vh] w-full bg-black overflow-hidden group",
                            videoKey && showVideo ? "cursor-pointer" : ""
                        )}
                        onClick={() => {
                            if (videoKey && showVideo) {
                                setIsFullVideoOpen(true);
                            }
                        }}
                    >
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

                        {videoKey && showVideo && (
                            <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-white/20 backdrop-blur-md border border-white/30 p-5 rounded-full shadow-2xl transform group-hover:scale-110 transition-transform">
                                    <PlayIcon className="w-10 h-10 text-white fill-white" />
                                </div>
                                <span className="absolute mt-24 text-white font-medium text-sm tracking-wider opacity-90 drop-shadow-md">VER TRAILER</span>
                            </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />

                        <div className="absolute bottom-0 left-0 p-4 sm:p-6 md:p-10 w-full z-10 pointer-events-none">
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl sm:text-4xl md:text-6xl font-bold text-white mb-2 leading-tight drop-shadow-xl font-display"
                            >
                                {movie.title}
                            </motion.h2>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="flex flex-wrap gap-2 text-xs sm:text-sm font-medium text-gray-200"
                            >
                                {movie.release_date && (
                                    <span className="flex items-center gap-1 sm:gap-1.5 backdrop-blur-sm bg-black/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5"><CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" /> {movie.release_date.split('-')[0]}</span>
                                )}
                                {movie.runtime > 0 && (
                                    <span className="flex items-center gap-1 sm:gap-1.5 backdrop-blur-sm bg-black/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5"><ClockIcon className="w-3 h-3 sm:w-4 sm:h-4" /> {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                                )}
                                {movie.production_countries?.length > 0 && (
                                    <span className="flex items-center gap-1 sm:gap-1.5 backdrop-blur-sm bg-black/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5 uppercase">
                                        <GlobeAltIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                                        {movie.production_countries[0].iso_3166_1}
                                    </span>
                                )}
                                {movie.vote_average > 0 && (
                                    <span className="flex items-center gap-1 sm:gap-1.5 text-yellow-400 backdrop-blur-sm bg-black/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5"><StarIconSolid className="w-3 h-3 sm:w-4 sm:h-4" /> {movie.vote_average.toFixed(1)}</span>
                                )}
                            </motion.div>
                        </div>
                    </div>

                    <div className="flex flex-col pb-24">
                        <div className="p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8">
                            <div className="max-w-4xl">
                                <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">Sinopsis</h3>
                                <p className="text-gray-300 leading-relaxed text-base md:text-lg font-light">
                                    {movie.overview || "No hay descripción disponible."}
                                </p>
                            </div>

                            {movie.genres && (
                                <div className="flex flex-wrap gap-2">
                                    {movie.genres.map(g => (
                                        <span key={g.id} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
                                            {g.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {watchProviders !== null && (
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-white mb-3">Dónde Ver</h3>
                                    {watchProviders?.flatrate?.length > 0 ? (
                                        <div className="flex flex-wrap gap-3">
                                            {watchProviders.flatrate.map(p => (
                                                <a
                                                    key={p.provider_id}
                                                    href={getDirectStreamingLink(p.provider_name, movie.title)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    title={`Ver en ${p.provider_name}`}
                                                    className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 hover:border-primary/40 hover:bg-white/10 transition-all group cursor-pointer"
                                                >
                                                    <img
                                                        src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                                                        alt={p.provider_name}
                                                        className="w-7 h-7 rounded-lg object-cover"
                                                    />
                                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                                                        {p.provider_name}
                                                    </span>
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                                            <span className="text-lg">😔</span>
                                            <span>Sin disponibilidad de streaming en tu región por el momento</span>
                                        </div>
                                    )}
                                </div>
                            )}


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


                <div className="p-4 bg-surface-elevated/95 backdrop-blur-xl border-t border-white/10 z-[60] relative">
                    {user && (
                        <div className="flex justify-end mb-3">
                            <button
                                onClick={() => setShowShareFriend(true)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary transition-colors group"
                            >
                                <UserGroupIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                Recomendar a un amigo
                            </button>
                        </div>
                    )}
                    {!watchedState && !watchlistState && (
                        <div className="flex gap-3 max-w-4xl mx-auto">
                            <div className="relative flex-1 group" ref={dropdownRef}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!user) { loginWithGoogle(); return; }
                                        setShowDropdown(!showDropdown);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-all border border-white/10 backdrop-blur-md active:scale-95 touch-manipulation"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span>Quiero verla</span>
                                    <ChevronDownIcon className="w-4 h-4 ml-1 opacity-70" />
                                </button>

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
                                    handleMoveToWatched();
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-black font-bold hover:bg-gray-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 touch-manipulation"
                            >
                                <CheckIcon className="w-5 h-5" />
                                <span>Ya la vi</span>
                            </button>
                        </div>
                    )}

                    {watchlistState && !watchedState && (
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
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Tu Calificación</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeMovie(movie.id);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/10 hover:border-red-500/30 group"
                                    title="Eliminar de mi historial"
                                >
                                    <TrashIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold tracking-wider uppercase">Borrar Vista</span>
                                </button>
                            </div>

                            <div className="flex justify-between items-center px-0.5" onMouseLeave={() => setHoverRating(0)}>
                                {Array.from({ length: 10 }, (_, i) => i + 1).map(star => {
                                    const isActive = (hoverRating || userRating) >= star;
                                    return (
                                        <button key={star} onMouseEnter={() => setHoverRating(star)} onClick={(e) => {
                                            e.stopPropagation();
                                            if (!user) { loginWithGoogle(); return; }
                                            triggerConfetti();
                                            playSuccess();
                                            addToWatched(movie, star);
                                        }} className="group p-1.5 sm:p-2 transition-transform hover:scale-125 focus:outline-none flex-1 flex justify-center touch-manipulation">
                                            {isActive ? <StarIconSolid className={cn("w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 transition-colors duration-200", star <= 4 ? "text-red-500" : star <= 7 ? "text-yellow-500" : "text-primary")} /> : <StarIcon className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-gray-700 group-hover:text-gray-500 transition-colors" />}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="h-8 flex flex-col items-center justify-center mt-2">
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
            </motion.div>

            <AnimatePresence>
                {isFullVideoOpen && videoKey && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex flex-col justify-center items-center"
                    >
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

                        <button
                            onClick={() => setIsFullVideoOpen(false)}
                            className="absolute top-6 right-6 z-[120] p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all transform hover:scale-110 pointer-events-auto"
                        >
                            <XMarkIcon className="w-8 h-8" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AddToListModal isOpen={showListModal} onClose={() => setShowListModal(false)} movie={movie} />

            <ShareWithFriendModal
                isOpen={showShareFriend}
                onClose={() => setShowShareFriend(false)}
                type="movie"
                payload={movie}
            />
        </div>
    );
};

export default MovieDetail;
