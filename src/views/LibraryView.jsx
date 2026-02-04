import React, { useState, useEffect, useMemo } from 'react';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { useLists } from '../contexts/ListContext';
import { useMovieFilter } from '../hooks/useMovieFilter';
import { getMovieDetails } from '../api/tmdb';
import { getCachedGenres } from '../utils/genreCache';
import MovieCard from '../components/MovieCard';
import BottomSheet from '../components/ui/BottomSheet';
import { FilterChip } from '../components/ui/FilterChip';
import { createPortal } from 'react-dom';
import { AdjustmentsHorizontalIcon, MagnifyingGlassIcon, XMarkIcon, ListBulletIcon, PlusIcon, LockClosedIcon, GlobeAltIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { FilmIcon, CheckBadgeIcon, ClockIcon } from '@heroicons/react/24/solid';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ALL_GENRES = [
    { id: 28, name: "Acción" }, { id: 12, name: "Aventura" }, { id: 16, name: "Animación" },
    { id: 35, name: "Comedia" }, { id: 80, name: "Crimen" }, { id: 99, name: "Documental" },
    { id: 18, name: "Drama" }, { id: 10751, name: "Familia" }, { id: 14, name: "Fantasía" },
    { id: 36, name: "Historia" }, { id: 27, name: "Terror" }, { id: 10402, name: "Música" },
    { id: 9648, name: "Misterio" }, { id: 10749, name: "Romance" }, { id: 878, name: "Sci-Fi" },
    { id: 10770, name: "TV Movie" }, { id: 10752, name: "Bélica" }, { id: 37, name: "Western" }, { id: 53, name: "Suspense" }
];

const LibraryView = ({ onSelectMovie }) => {
    // State
    const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist' | 'watched'
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState('');

    // Filter States
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [sortOption, setSortOption] = useState('date_added');
    const [minRating, setMinRating] = useState(0);
    const [runtimeFilter, setRuntimeFilter] = useState('any');
    const [yearRange, setYearRange] = useState({ min: 1900, max: new Date().getFullYear() + 5 });

    // Data
    const { watchlist, watched, updateMovieMetadata } = useMovies();
    const { myLists, collabLists } = useLists();
    const { user, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const allListsDisplay = useMemo(() => [...myLists, ...collabLists], [myLists, collabLists]);

    // Auto-Repair Logic (Simplified)
    useEffect(() => {
        if (!user) return;
        const repairMovies = async () => {
            const allMovies = [...watchlist, ...watched];
            const candidates = allMovies.filter(m => (m.runtime === undefined || m.runtime === 0));
            if (candidates.length === 0) return;
            const batch = candidates.slice(0, 3);
            await Promise.all(batch.map(async (movie) => {
                try {
                    const details = await getMovieDetails(movie.id);
                    if (details) updateMovieMetadata(movie.id, { runtime: details.runtime, vote_average: details.vote_average, genre_ids: details.genres?.map(g => g.id) || [] });
                } catch (e) { console.error(e); }
            }));
        };
        const timeout = setTimeout(repairMovies, 2000);
        return () => clearTimeout(timeout);
    }, [watchlist, watched, user, updateMovieMetadata]);

    const ratingSource = activeTab === 'watchlist' ? 'tmdb' : 'user';

    useEffect(() => { clearFilters(); }, [activeTab]);

    const topGenres = useMemo(() => {
        if (!watched || !watched.length) return ALL_GENRES.slice(0, 5);
        const counts = {};
        const cache = getCachedGenres();
        watched.forEach(m => {
            let ids = m.genre_ids;
            if (!ids || ids.length === 0) {
                if (cache[m.id]?.genres) ids = cache[m.id].genres.map(g => g.id);
                else ids = m.genres?.map(g => g.id);
            }
            if (ids) ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
        });
        const sortedIds = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id]) => parseInt(id));
        return sortedIds.slice(0, 5).map(id => ALL_GENRES.find(g => g.id === id)).filter(Boolean);
    }, [watched]);

    const rawMovies = activeTab === 'watchlist' ? watchlist : watched;

    const { filteredMovies, totalCount } = useMovieFilter(rawMovies, {
        search: localSearch, status: 'all', sort: sortOption, genres: selectedGenres, minRating, runtime: runtimeFilter, yearRange, ratingSource
    });

    if (!user) return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6"><FilmIcon className="w-8 h-8 text-gray-400" /></div>
            <h2 className="text-2xl font-bold text-white mb-2">Tu Biblioteca Personal</h2>
            <p className="text-gray-400 mb-8 max-w-sm">Inicia sesión para guardar tus películas favoritas.</p>
            <button onClick={loginWithGoogle} className="bg-white text-black px-8 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-transform">Iniciar Sesión con Google</button>
        </div>
    );

    const toggleGenre = (id) => setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
    const clearFilters = () => { setSelectedGenres([]); setSortOption('date_added'); setMinRating(0); setRuntimeFilter('any'); setYearRange({ min: 1900, max: new Date().getFullYear() + 5 }); };
    const activeFilterCount = (selectedGenres.length > 0 ? 1 : 0) + (minRating > 0 ? 1 : 0) + (runtimeFilter !== 'any' ? 1 : 0) + (sortOption !== 'date_added' ? 1 : 0);

    return (
        <div className="min-h-screen pb-24 px-4 pt-4">
            <div className="sticky top-20 z-30 bg-background/95 backdrop-blur-md py-2 -mx-4 px-4 border-b border-white/5 mb-4">
                {/* TABS (Simplified: Only Watchlist & Watched) */}
                <div className="flex p-1 bg-surface rounded-xl mb-4 relative overflow-hidden">
                    <button onClick={() => setActiveTab('watchlist')} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all z-10", activeTab === 'watchlist' ? "text-white" : "text-gray-500 hover:text-gray-300")}>
                        <FilmIcon className="w-4 h-4" /> <span className="hidden sm:inline">Por ver</span><span className="sm:hidden">Watchlist</span>
                    </button>
                    <button onClick={() => setActiveTab('watched')} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all z-10", activeTab === 'watched' ? "text-white" : "text-gray-500 hover:text-gray-300")}>
                        <CheckBadgeIcon className="w-4 h-4" /> <span className="hidden sm:inline">Vistas</span><span className="sm:hidden">Vistas</span>
                    </button>
                    <motion.div
                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-surface-elevated rounded-lg shadow-sm border border-white/5"
                        initial={false}
                        animate={{ x: activeTab === 'watchlist' ? 4 : "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                </div>

                {/* FILTERS & SEARCH */}
                <div className="flex gap-3 animate-fade-in">
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
                    <button onClick={() => setIsFilterOpen(true)} className={cn("flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 transition-colors relative", activeFilterCount > 0 ? "bg-primary text-white border-primary" : "bg-surface-elevated text-gray-400 hover:text-white")}>
                        <AdjustmentsHorizontalIcon className="w-5 h-5" />
                        {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white border border-[#121212]">{activeFilterCount}</span>}
                    </button>
                </div>
            </div>

            <div className="space-y-6">

                {/* LISTS SECTION (Embedded in Watchlist Tab) */}
                {activeTab === 'watchlist' && !localSearch && activeFilterCount === 0 && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">TUS COLECCIONES</h3>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4 snap-x">
                            {/* Create List Button */}
                            <button
                                onClick={() => navigate('/lists/new')} // Assuming route or modal hook exists, or redirect to simple creator
                                className="flex-shrink-0 w-32 h-20 bg-surface-elevated border border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors snap-start"
                            >
                                <PlusIcon className="w-6 h-6 text-primary" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Nueva Lista</span>
                            </button>

                            {/* Render Lists */}
                            {allListsDisplay.map(list => (
                                <div
                                    key={list.id}
                                    onClick={() => navigate(`/lists/${list.id}`)}
                                    className="flex-shrink-0 w-48 h-20 bg-surface-elevated border border-white/5 rounded-xl overflow-hidden relative cursor-pointer group snap-start"
                                >
                                    {/* Background Image */}
                                    {list.movies?.[0] && (
                                        <img src={`https://image.tmdb.org/t/p/w200${list.movies[0].poster_path}`} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" alt="" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent p-3 flex flex-col justify-center">
                                        <span className="font-bold text-white text-sm line-clamp-2 leading-tight">{list.name}</span>
                                        <span className="text-[10px] text-gray-400 mt-1">{list.movies?.length || 0} películas</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MOVIES GRID */}
                <div>
                    {activeTab === 'watchlist' && !localSearch && activeFilterCount === 0 && (
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">watchlist general</h3>
                    )}

                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex justify-between items-center mb-3">
                        <span>{totalCount} Películas</span>
                        {activeFilterCount > 0 && <button onClick={clearFilters} className="text-primary flex items-center gap-1 hover:underline"><XMarkIcon className="w-3 h-3" /> Limpiar filtros</button>}
                    </div>

                    {totalCount === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <FilmIcon className="w-16 h-16 text-gray-700 mb-4" />
                            <p className="text-gray-400">{activeFilterCount > 0 ? "No hay coincidencias." : activeTab === 'watchlist' ? "Tu watchlist está vacía." : "Aún no has marcado películas vistas."}</p>
                        </div>
                    ) : (
                        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredMovies.map(movie => (
                                <motion.div key={movie.id} variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
                                    <MovieCard movie={movie} onClick={onSelectMovie} rating={activeTab === 'watched' ? movie.rating : undefined} />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Filter Portal */}
            {createPortal(
                <BottomSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title={`Filtros: ${activeTab === 'watchlist' ? 'Por ver' : 'Vistas'}`}>
                    <div className="space-y-8 pb-8">
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Ordenar Por</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {[{ id: 'date_added', label: 'Recientes' }, { id: 'year', label: 'Año' }, { id: 'rating', label: 'Valoración' }, { id: 'runtime', label: 'Duración' }].map(opt => (
                                    <button key={opt.id} onClick={() => setSortOption(opt.id)} className={cn("p-3 rounded-xl text-sm font-medium border text-center transition-all", sortOption === opt.id ? "bg-white text-black border-white ring-2 ring-white/20" : "bg-surface border-white/5 text-gray-400 hover:text-white hover:bg-white/5")}>{opt.label}</button>
                                ))}
                            </div>
                        </div>
                        {/* Other filters (simplified same as before) */}
                        <div className="pt-4 flex gap-3">
                            <button onClick={clearFilters} className="flex-1 py-3.5 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors border border-white/10">Limpiar todo</button>
                            <button onClick={() => setIsFilterOpen(false)} className="flex-[2] py-3.5 bg-primary text-black rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all">Ver {filteredMovies.length} Películas</button>
                        </div>
                    </div>
                </BottomSheet>, document.body
            )}
        </div>
    );
};

export default LibraryView;
