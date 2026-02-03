import React, { useState, useEffect, useMemo } from 'react';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { useMovieFilter } from '../hooks/useMovieFilter';
import { getMovieDetails } from '../api/tmdb';
import { getCachedGenres } from '../utils/genreCache';
import MovieCard from '../components/MovieCard';
import BottomSheet from '../components/ui/BottomSheet';
import { FilterChip } from '../components/ui/FilterChip';
import { createPortal } from 'react-dom';
import { AdjustmentsHorizontalIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { FilmIcon, CheckBadgeIcon, StarIcon, ClockIcon } from '@heroicons/react/24/solid';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

// Complete Genre List for Mapping
const ALL_GENRES = [
    { id: 28, name: "Acción" },
    { id: 12, name: "Aventura" },
    { id: 16, name: "Animación" },
    { id: 35, name: "Comedia" },
    { id: 80, name: "Crimen" },
    { id: 99, name: "Documental" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Familia" },
    { id: 14, name: "Fantasía" },
    { id: 36, name: "Historia" },
    { id: 27, name: "Terror" },
    { id: 10402, name: "Música" },
    { id: 9648, name: "Misterio" },
    { id: 10749, name: "Romance" },
    { id: 878, name: "Sci-Fi" },
    { id: 10770, name: "TV Movie" },
    { id: 10752, name: "Bélica" },
    { id: 37, name: "Western" },
    { id: 53, name: "Suspense" }
];

const LibraryView = ({ onSelectMovie }) => {
    // State
    const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist' | 'watched'
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState('');

    // Filter States
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [sortOption, setSortOption] = useState('date_added'); // 'date_added', 'rating', 'year'
    const [minRating, setMinRating] = useState(0);
    const [runtimeFilter, setRuntimeFilter] = useState('any'); // 'any', 'short', 'medium', 'long'
    const [yearRange, setYearRange] = useState({ min: 1900, max: new Date().getFullYear() + 5 });

    // Data
    const { watchlist, watched, updateMovieMetadata } = useMovies();
    const { user, loginWithGoogle } = useAuth();

    // Auto-Repair: Fix older movies missing runtime/votes for filters
    useEffect(() => {
        if (!user) return;

        const repairMovies = async () => {
            const allMovies = [...watchlist, ...watched];
            // Identify invalid data (missing runtime is the main blocker for filters)
            const candidates = allMovies.filter(m =>
                (m.runtime === undefined || m.runtime === 0) ||
                (m.vote_average === undefined)
            );

            if (candidates.length === 0) return;

            // Debounce/Limit to avoid spamming on every render if update is slow
            // Increase batch size to speed up initial sync
            const batch = candidates.slice(0, 10);
            console.log(`[LibraryView] 🔧 Repairing metadata for ${batch.length} movies... (remaining: ${candidates.length})`);

            await Promise.all(batch.map(async (movie) => {
                try {
                    const details = await getMovieDetails(movie.id);
                    if (details) {
                        updateMovieMetadata(movie.id, {
                            runtime: details.runtime,
                            vote_average: details.vote_average,
                            genre_ids: details.genres?.map(g => g.id) || []
                        });
                    }
                } catch (e) {
                    console.error("Error repairing movie", movie.title, e);
                }
            }));
        };

        // Short debounce to allow UI updates between batches
        const timeout = setTimeout(repairMovies, 500);
        return () => clearTimeout(timeout);
    }, [watchlist, watched]);

    // Derived Settings based on Tab
    const ratingSource = activeTab === 'watchlist' ? 'tmdb' : 'user';

    // Clear filters when switching tabs to prevent invalid states (e.g. minRating 8 in user mode)
    useEffect(() => {
        clearFilters();
    }, [activeTab]);

    // Calculate Top 5 Genres based on 'watched' history (User preferences)
    // Used for both lists as "User's favorite genres"
    const topGenres = useMemo(() => {
        if (!watched || !watched.length) {
            // Default generic mix if no history
            return ALL_GENRES.filter(g => [28, 35, 18, 878, 27].includes(g.id));
        }

        const counts = {};
        const cache = getCachedGenres(); // Check centralized cache for better accuracy

        watched.forEach(m => {
            // Priority: 1. Movie Data props (if repaired), 2. Cache, 3. Old genres prop
            let ids = m.genre_ids;

            if (!ids || ids.length === 0) {
                // Try cache
                if (cache[m.id] && cache[m.id].genres) {
                    ids = cache[m.id].genres.map(g => g.id);
                } else {
                    // Try direct prop as fallback
                    ids = m.genres?.map(g => g.id);
                }
            }

            if (ids) {
                ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
            }
        });

        // Sort by frequency
        const sortedIds = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => parseInt(id));

        // Get unique top 5 mapped to objects
        let top = [];
        for (const id of sortedIds) {
            const genre = ALL_GENRES.find(g => g.id === id);
            if (genre) top.push(genre);
            if (top.length >= 5) break;
        }

        // Fill if less than 5
        if (top.length < 5) {
            const existing = top.map(g => g.id);
            const fillers = ALL_GENRES.filter(g => !existing.includes(g.id)).slice(0, 5 - top.length);
            top = [...top, ...fillers];
        }

        return top;
    }, [watched]);

    const rawMovies = activeTab === 'watchlist' ? watchlist : watched;

    // Smart Filtering Hook
    const { filteredMovies, totalCount } = useMovieFilter(rawMovies, {
        search: localSearch,
        status: 'all',
        sort: sortOption,
        genres: selectedGenres,
        minRating,
        runtime: runtimeFilter,
        yearRange,
        ratingSource // Passing the source context
    });

    if (!user) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
                    <FilmIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Tu Biblioteca Personal</h2>
                <p className="text-gray-400 mb-8 max-w-sm">
                    Inicia sesión para guardar tus películas favoritas, calificarlas y sincronizarlas en todos tus dispositivos.
                </p>
                <button
                    onClick={loginWithGoogle}
                    className="bg-white text-black px-8 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-transform"
                >
                    Iniciar Sesión con Google
                </button>
            </div>
        );
    }

    const toggleGenre = (id) => {
        setSelectedGenres(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const clearFilters = () => {
        setSelectedGenres([]);
        setSortOption('date_added');
        setMinRating(0);
        setRuntimeFilter('any');
        setYearRange({ min: 1900, max: new Date().getFullYear() + 5 });
    };

    const activeFilterCount = (selectedGenres.length > 0 ? 1 : 0) + (minRating > 0 ? 1 : 0) + (runtimeFilter !== 'any' ? 1 : 0) + (sortOption !== 'date_added' ? 1 : 0);

    return (
        <div className="min-h-screen pb-24 px-4 pt-4">
            {/* Sticky Header Actions */}
            <div className="sticky top-20 z-30 bg-background/95 backdrop-blur-md py-2 -mx-4 px-4 border-b border-white/5 mb-6">
                {/* Tabs */}
                <div className="flex p-1 bg-surface rounded-xl mb-4 relative overflow-hidden">
                    <button
                        onClick={() => setActiveTab('watchlist')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all z-10",
                            activeTab === 'watchlist' ? "text-white" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        <FilmIcon className="w-4 h-4" /> Por ver
                    </button>
                    <button
                        onClick={() => setActiveTab('watched')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all z-10",
                            activeTab === 'watched' ? "text-white" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        <CheckBadgeIcon className="w-4 h-4" /> Vistas
                    </button>

                    {/* Sliding Background */}
                    <motion.div
                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-surface-elevated rounded-lg shadow-sm border border-white/5"
                        initial={false}
                        animate={{ x: activeTab === 'watchlist' ? 4 : "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                </div>

                {/* Search & Filter Bar */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder={`Buscar en ${activeTab === 'watchlist' ? 'Por ver' : 'Vistas'}...`}
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="w-full bg-surface-elevated border-none text-sm text-white rounded-xl py-3 pl-10 pr-4 placeholder-gray-500 focus:ring-1 focus:ring-primary/50"
                        />
                    </div>
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 transition-colors relative",
                            activeFilterCount > 0
                                ? "bg-primary text-white border-primary"
                                : "bg-surface-elevated text-gray-400 hover:text-white"
                        )}
                    >
                        <AdjustmentsHorizontalIcon className="w-5 h-5" />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white border border-[#121212]">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Movie Grid Header */}
            <div className="space-y-4">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex justify-between items-center">
                    <span>{totalCount} Películas</span>
                    {activeFilterCount > 0 && (
                        <button onClick={clearFilters} className="text-primary flex items-center gap-1 hover:underline">
                            <XMarkIcon className="w-3 h-3" /> Limpiar filtros
                        </button>
                    )}
                </div>

                {totalCount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <FilmIcon className="w-16 h-16 text-gray-700 mb-4" />
                        <p className="text-gray-400">
                            {activeFilterCount > 0
                                ? "No hay coincidencias en esta lista."
                                : activeTab === 'watchlist' ? "Tu lista está vacía." : "Aún no has marcado películas vistas."}
                        </p>
                        {activeFilterCount > 0 && (
                            <button onClick={clearFilters} className="mt-4 text-primary text-sm font-bold">
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <motion.div
                        variants={{
                            hidden: { opacity: 0 },
                            show: { opacity: 1, transition: { staggerChildren: 0.1 } }
                        }}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    >
                        {filteredMovies.map(movie => (
                            <motion.div
                                key={movie.id}
                                variants={{
                                    hidden: { opacity: 0, scale: 0.9 },
                                    show: { opacity: 1, scale: 1 }
                                }}
                            >
                                <MovieCard
                                    movie={movie}
                                    onClick={onSelectMovie}
                                    // If in watched, show user rating. If watchlist, can show TMDB rating or nothing.
                                    rating={activeTab === 'watched' ? movie.rating : undefined}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Filter Bottom Sheet */}
            {createPortal(
                <BottomSheet
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                    title={`Filtros: ${activeTab === 'watchlist' ? 'Por ver' : 'Vistas'}`}
                >
                    <div className="space-y-8 pb-8">
                        {/* 1. Sort Section */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Ordenar Por</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'date_added', label: 'Recientes' },
                                    { id: 'year', label: 'Año' },
                                    { id: 'rating', label: 'Valoración' },
                                    { id: 'runtime', label: 'Duración' },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setSortOption(opt.id)}
                                        className={cn(
                                            "p-3 rounded-xl text-sm font-medium border text-center transition-all",
                                            sortOption === opt.id
                                                ? "bg-white text-black border-white ring-2 ring-white/20"
                                                : "bg-surface border-white/5 text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Rating Filter (Dynamic Logic) */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    {activeTab === 'watchlist' ? 'Calidad TMDB Mínima' : 'Tu Calificación Mínima'}
                                </h4>
                                <span className="text-xs font-mono text-primary">
                                    {minRating > 0 ? `${minRating}+ ${activeTab === 'watchlist' ? 'Puntos' : 'Estrellas'}` : 'Cualquiera'}
                                </span>
                            </div>

                            {activeTab === 'watchlist' ? (
                                // TMDB Scale (2-9)
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-surface-elevated p-3 rounded-xl border border-white/5">
                                    {[2, 3, 4, 5, 6, 7, 8, 9].map(score => (
                                        <button
                                            key={score}
                                            onClick={() => setMinRating(minRating === score ? 0 : score)}
                                            className={cn(
                                                "aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all border",
                                                minRating === score
                                                    ? "bg-primary text-black border-primary shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                                                    : "bg-transparent border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                            )}
                                        >
                                            {score}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                // User Scale (1-5 Stars)
                                <div className="flex gap-2 justify-between bg-surface-elevated p-3 rounded-xl border border-white/5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            onClick={() => setMinRating(minRating === star ? 0 : star)}
                                            className="transition-transform active:scale-90"
                                        >
                                            <StarIcon className={cn("w-8 h-8 transition-colors", star <= minRating ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-gray-700")} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 3. Runtime Filter */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Duración</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'short', label: 'Corta', sub: '< 90m' },
                                    { id: 'medium', label: 'Media', sub: '90-120m' },
                                    { id: 'long', label: 'Larga', sub: '> 120m' },
                                ].map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => setRuntimeFilter(runtimeFilter === r.id ? 'any' : r.id)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
                                            runtimeFilter === r.id
                                                ? "bg-primary/20 border-primary text-primary"
                                                : "bg-surface border-white/5 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <ClockIcon className="w-5 h-5 mb-1" />
                                        <span className="text-xs font-bold">{r.label}</span>
                                        <span className="text-[10px] opacity-60 font-mono">{r.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. Years */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Década</h4>
                            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                <button
                                    onClick={() => setYearRange({ min: 1900, max: 2050 })}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap",
                                        yearRange.min === 1900
                                            ? "bg-white text-black border-white"
                                            : "bg-surface border-white/10 text-gray-400"
                                    )}
                                >
                                    Todas
                                </button>
                                {[2020, 2010, 2000, 1990, 1980, 1970].map(decade => {
                                    const isSelected = yearRange.min === decade && yearRange.max === decade + 9;
                                    return (
                                        <button
                                            key={decade}
                                            onClick={() => setYearRange(isSelected ? { min: 1900, max: 2050 } : { min: decade, max: decade + 9 })}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap",
                                                isSelected
                                                    ? "bg-primary text-black border-primary"
                                                    : "bg-surface border-white/10 text-gray-400 hover:text-white"
                                            )}
                                        >
                                            {decade}s
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 5. Genres (Dynamic Top 5) */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tus Géneros Favoritos</h4>
                                {selectedGenres.length > 0 && <span className="text-xs text-primary">{selectedGenres.length} seleccionados</span>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {topGenres.map(g => (
                                    <FilterChip
                                        key={g.id}
                                        label={g.name}
                                        isSelected={selectedGenres.includes(g.id)}
                                        onClick={() => toggleGenre(g.id)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={clearFilters}
                                className="flex-1 py-3.5 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors border border-white/10"
                            >
                                Limpiar todo
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="flex-[2] py-3.5 bg-primary text-black rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all"
                            >
                                Ver {filteredMovies.length} Películas
                            </button>
                        </div>
                    </div>
                </BottomSheet>,
                document.body
            )}
        </div>
    );
};

export default LibraryView;
