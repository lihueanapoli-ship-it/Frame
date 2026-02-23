import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { useLists } from '../contexts/ListContext';
import { useMovieFilter } from '../hooks/useMovieFilter';
import { getMovieDetails, getWatchProviders } from '../api/tmdb';
import { getCachedGenres } from '../utils/genreCache';
import MovieCard from '../components/MovieCard';
import BottomSheet from '../components/ui/BottomSheet';
import { createPortal } from 'react-dom';
import { AdjustmentsHorizontalIcon, MagnifyingGlassIcon, XMarkIcon, UserPlusIcon, TrashIcon, ChevronDownIcon, CheckBadgeIcon, ClockIcon } from '@heroicons/react/24/outline';
import { FilterChip } from '../components/ui/FilterChip';
import { FilmIcon } from '@heroicons/react/24/solid';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ManageListMembersModal from '../components/ui/ManageListMembersModal';
import CreateListModal from '../components/ui/CreateListModal';
import StreamingProviderFilter from '../components/ui/StreamingProviderFilter';

const GENRES = [
    { id: 28, name: "Acción", emoji: "💥" },
    { id: 12, name: "Aventura", emoji: "🤠" },
    { id: 16, name: "Animación", emoji: "🎨" },
    { id: 35, name: "Comedia", emoji: "🤣" },
    { id: 80, name: "Crimen", emoji: "🕵️" },
    { id: 99, name: "Documental", emoji: "🌍" },
    { id: 18, name: "Drama", emoji: "🎭" },
    { id: 10751, name: "Familia", emoji: "👨‍👩‍👧‍👦" },
    { id: 14, name: "Fantasía", emoji: "🐉" },
    { id: 36, name: "Historia", emoji: "🏛️" },
    { id: 27, name: "Terror", emoji: "👻" },
    { id: 10402, name: "Música", emoji: "🎵" },
    { id: 9648, name: "Misterio", emoji: "🔦" },
    { id: 10749, name: "Romance", emoji: "💘" },
    { id: 878, name: "Ciencia Ficción", emoji: "🚀" },
    { id: 10770, name: "Película de TV", emoji: "📺" },
    { id: 10752, name: "Bélica", emoji: "⚔️" },
    { id: 37, name: "Western", emoji: "🌵" },
];

const LibraryView = ({ onSelectMovie }) => {
    // State
    const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist' | 'watched'
    const [selectedListId, setSelectedListId] = useState('watchlist');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState('');
    const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
    const [isCreateListOpen, setIsCreateListOpen] = useState(false);

    // Filter States
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [sortOption, setSortOption] = useState('date_added');
    const [minRating, setMinRating] = useState(0);
    const [runtimeFilter, setRuntimeFilter] = useState('any');
    const [yearRange, setYearRange] = useState({ min: 1900, max: new Date().getFullYear() + 5 });
    const [selectedPlatforms, setSelectedPlatforms] = useState([]);
    const [platformFilteredMovies, setPlatformFilteredMovies] = useState(null);
    const [isFetchingProviders, setIsFetchingProviders] = useState(false);
    const providersCacheRef = useRef({});

    // Data
    const { watchlist, watched } = useMovies(); // Watchlist deprecated in favor of Lists
    const { myLists, collabLists, addCollaborator, deleteList, leaveList, generalList } = useLists();
    const { user, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const allListsDisplay = useMemo(() => [...myLists, ...collabLists], [myLists, collabLists]);

    // Initial Selection: Default to General List
    useEffect(() => {
        if (selectedListId === 'watchlist' && generalList) {
            setSelectedListId(generalList.id);
        }
    }, [generalList, selectedListId]);

    const currentCustomList = useMemo(() => {
        if (!allListsDisplay.length) return null;
        return allListsDisplay.find(l => l.id === selectedListId) || generalList || allListsDisplay[0];
    }, [selectedListId, allListsDisplay, generalList]);

    const rawMovies = useMemo(() => {
        if (activeTab === 'watched') return watched;
        // In 'watchlist' tab, we show the currently selected LIST (General or Custom)
        return currentCustomList?.movies || [];
    }, [activeTab, currentCustomList, watched]);

    // Handlers
    // Invite/Manage logic moved to Modal.

    const handleDeleteList = async () => {
        if (!currentCustomList) return;
        if (window.confirm("¿Estás seguro de que quieres eliminar esta lista?")) {
            await deleteList(currentCustomList.id);
            setSelectedListId('watchlist');
        }
    };

    const handleLeaveList = async () => {
        if (!currentCustomList) return;
        if (window.confirm(`¿Abandonar la lista "${currentCustomList.name}"?`)) {
            await leaveList(currentCustomList.id);
            setSelectedListId('watchlist');
        }
    };

    // Filter Logic
    const ratingSource = activeTab === 'watchlist' ? 'tmdb' : 'user';
    useEffect(() => { clearFilters(); }, [activeTab, selectedListId]);

    const { filteredMovies, totalCount } = useMovieFilter(rawMovies, {
        search: localSearch,
        status: 'all',
        sort: sortOption,
        genres: selectedGenres,
        minRating,
        runtime: runtimeFilter,
        yearRange,
        ratingSource
    });

    // Platform filter — async: fetch providers in batches and filter locally
    useEffect(() => {
        if (selectedPlatforms.length === 0) {
            setPlatformFilteredMovies(null);
            return;
        }
        let cancelled = false;
        const run = async () => {
            setIsFetchingProviders(true);
            const BATCH = 5;
            const movies = filteredMovies.slice(0, 200);
            for (let i = 0; i < movies.length; i += BATCH) {
                if (cancelled) break;
                await Promise.all(
                    movies.slice(i, i + BATCH).map(async (m) => {
                        if (!providersCacheRef.current[m.id]) {
                            providersCacheRef.current[m.id] = await getWatchProviders(m.id);
                        }
                    })
                );
            }
            if (!cancelled) {
                const result = movies.filter(m => {
                    const ids = (providersCacheRef.current[m.id]?.flatrate || []).map(p => p.provider_id);
                    return selectedPlatforms.some(id => ids.includes(id));
                });
                setPlatformFilteredMovies(result);
                setIsFetchingProviders(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [selectedPlatforms, filteredMovies]);

    const displayMovies = platformFilteredMovies ?? filteredMovies;

    if (!user) return <div className="min-h-screen" />;

    const clearFilters = () => {
        setSelectedGenres([]);
        setSortOption('date_added');
        setMinRating(0);
        setRuntimeFilter('any');
        setYearRange({ min: 1900, max: new Date().getFullYear() + 5 });
        setSelectedPlatforms([]);
        setPlatformFilteredMovies(null);
    };

    const activeFilterCount = (selectedGenres.length > 0 ? 1 : 0) + (minRating > 0 ? 1 : 0) + (runtimeFilter !== 'any' ? 1 : 0) + (sortOption !== 'date_added' ? 1 : 0) + (yearRange.min > 1900 ? 1 : 0) + (selectedPlatforms.length > 0 ? 1 : 0);

    return (
        <div className="min-h-screen pb-24 px-4 pt-8">
            {/* HERO HEADER */}
            <header className="mb-8 flex items-end justify-between border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2 tracking-tight">
                        MI <span className="text-primary">BIBLIOTECA</span>
                    </h1>
                    <p className="font-mono text-xs md:text-sm text-gray-400">
                        COLECCIONES Y VISTAS
                    </p>
                </div>
            </header>

            {/* CONTROLS (Sticky Tabs Only) */}
            <div className="sticky top-20 z-30 bg-[#0A0A0A] py-4 -mx-4 px-4 border-b border-white/5 mb-6 shadow-xl">
                {/* 1. TABS */}
                <div className="flex p-1 bg-surface rounded-xl relative overflow-hidden">
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
            </div>

            {/* NON-STICKY CONTROLS (Scrollable) */}
            <div className="space-y-4 mb-6">
                {/* 2. LIST SELECTOR (Unified) */}
                {activeTab === 'watchlist' && (
                    <div className="relative z-10 space-y-4">
                        {/* Custom Dropdown Trigger */}
                        <div className="relative">
                            <select
                                value={currentCustomList?.id || ''}
                                onChange={(e) => {
                                    if (e.target.value === 'new') {
                                        setIsCreateListOpen(true);
                                    } else {
                                        setSelectedListId(e.target.value);
                                    }
                                }}
                                className="w-full appearance-none bg-[#111] border border-white/10 text-white rounded-xl py-3 pl-4 pr-10 text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                <optgroup label="Mis Listas">
                                    {myLists.map(list => (
                                        <option key={list.id} value={list.id} className="bg-[#111] text-white">
                                            {list.name === 'General' ? '🎬 General' : `📑 ${list.name}`}
                                        </option>
                                    ))}
                                </optgroup>
                                {collabLists.length > 0 && (
                                    <optgroup label="Compartidas Conmigo">
                                        {collabLists.map(list => (
                                            <option key={list.id} value={list.id} className="bg-[#111] text-white">
                                                👥 {list.name} (de {list.ownerName || 'Usuario'})
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                                <option value="new" className="bg-[#111] text-primary font-bold">+ Crear Nueva Lista...</option>
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        {/* RICH LIST HEADER BANNER */}
                        {currentCustomList && currentCustomList.name !== 'General' && (
                            <div className="bg-gradient-to-r from-surface-elevated to-surface border border-white/5 rounded-2xl p-5 relative overflow-hidden group animate-fade-in">
                                {/* Background Glow */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-2xl font-display font-bold text-white truncate">
                                                {currentCustomList.name}
                                            </h2>
                                            {currentCustomList.collaborators?.length > 0 && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20 flex items-center gap-1">
                                                    Compartida
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 line-clamp-1 mb-3">
                                            {currentCustomList.description || "Sin descripción"}
                                        </p>

                                        {/* MEMBERS & ACTIONS ROW */}
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setIsManageMembersOpen(true)} className="flex items-center gap-2 group/members hover:bg-white/5 p-1.5 rounded-lg transition-colors -ml-1.5">
                                                <div className="flex -space-x-2">
                                                    {/* Owner Avatar Placeholder */}
                                                    <div className="w-6 h-6 rounded-full border border-[#121212] bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white" title={`Dueño: ${currentCustomList.ownerName}`}>
                                                        {currentCustomList.ownerName?.[0]?.toUpperCase() || 'O'}
                                                    </div>
                                                    {/* Collabs Count */}
                                                    {(currentCustomList.collaborators?.length || 0) > 0 && (
                                                        <div className="w-6 h-6 rounded-full border border-[#121212] bg-surface-elevated flex items-center justify-center text-[9px] font-bold text-gray-400">
                                                            +{currentCustomList.collaborators.length}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-400 group-hover/members:text-primary transition-colors">
                                                    {currentCustomList.ownerId === user.uid ? "Gestionar miembros" : "Ver miembros"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* PRIMARY ACTIONS */}
                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        {currentCustomList.ownerId === user.uid ? (
                                            <>
                                                <button
                                                    onClick={() => setIsManageMembersOpen(true)}
                                                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                                >
                                                    <UserPlusIcon className="w-3.5 h-3.5" /> Invitar
                                                </button>
                                                <button onClick={handleDeleteList} className="w-8 h-8 flex items-center justify-center bg-surface-elevated border border-white/10 rounded-lg hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-colors text-gray-400" title="Eliminar lista">
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={handleLeaveList} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                                                <XMarkIcon className="w-3.5 h-3.5" /> Abandonar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. FILTERS & SEARCH */}
                <div className="flex gap-3 animate-fade-in">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder={`Buscar en ${currentCustomList ? currentCustomList.name : activeTab === 'watchlist' ? 'Watchlist' : 'Vistas'}...`}
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

            {/* GRID */}
            <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex justify-between items-center mb-3">
                    <span>{totalCount} Películas</span>
                    {activeFilterCount > 0 && <button onClick={clearFilters} className="text-primary flex items-center gap-1 hover:underline"><XMarkIcon className="w-3 h-3" /> Limpiar filtros</button>}
                </div>
                {/* ... Grid logic same as before ... */}
                {isFetchingProviders ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-gray-500">Buscando disponibilidad en plataformas...</p>
                    </div>
                ) : displayMovies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <FilmIcon className="w-16 h-16 text-gray-700 mb-4" />
                        <p className="text-gray-400">
                            {activeFilterCount > 0 ? "No hay coincidencias." :
                                currentCustomList ? "Esta lista está vacía." :
                                    activeTab === 'watchlist' ? "Tu watchlist está vacía." : "Aún no has marcado películas vistas."}
                        </p>
                        {currentCustomList && (<button onClick={() => navigate('/')} className="mt-4 text-primary text-sm font-bold hover:underline">Explorar películas para añadir</button>)}
                    </div>
                ) : (
                    <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {displayMovies.map(movie => (
                            <motion.div key={movie.id} variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
                                <MovieCard movie={movie} onClick={onSelectMovie} rating={activeTab === 'watched' ? movie.rating : undefined} />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* MODALS */}
            {
                createPortal(
                    <BottomSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filtros Avanzados">
                        <div className="space-y-8 pb-8">
                            {/* Sort */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Ordenar Por</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ id: 'date_added', label: 'Recientes' }, { id: 'year', label: 'Año' }, { id: 'rating', label: 'Valoración' }, { id: 'runtime', label: 'Duración' }].map(opt => (
                                        <button key={opt.id} onClick={() => setSortOption(opt.id)} className={cn("p-3 rounded-xl text-sm font-medium border text-center transition-all", sortOption === opt.id ? "bg-white text-black border-white ring-2 ring-white/20" : "bg-surface border-white/5 text-gray-400 hover:text-white hover:bg-white/5")}>{opt.label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Rating */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Calificación Mínima</h4>
                                    <span className="text-xs font-mono text-primary">{minRating > 0 ? `${minRating}+ Puntos` : 'Cualquiera'}</span>
                                </div>
                                <div className="grid grid-cols-8 gap-2 bg-surface-elevated p-3 rounded-xl border border-white/5">
                                    {[2, 3, 4, 5, 6, 7, 8, 9].map(score => (
                                        <button key={score} onClick={() => setMinRating(minRating === score ? 0 : score)} className={cn("aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all border", minRating === score ? "bg-primary text-black border-primary" : "bg-transparent border-white/5 text-gray-400 hover:bg-white/10 hover:text-white")}>{score}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Runtime */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Duración</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {[{ id: 'short', label: 'Corta', sub: '< 90m' }, { id: 'medium', label: 'Media', sub: '90-120m' }, { id: 'long', label: 'Larga', sub: '> 120m' }].map(r => (
                                        <button key={r.id} onClick={() => setRuntimeFilter(runtimeFilter === r.id ? 'any' : r.id)} className={cn("flex flex-col items-center justify-center p-3 rounded-xl border transition-all", runtimeFilter === r.id ? "bg-primary/20 border-primary text-primary" : "bg-surface border-white/5 text-gray-400 hover:bg-white/5")}><ClockIcon className="w-5 h-5 mb-1" /><span className="text-xs font-bold">{r.label}</span><span className="text-[10px] opacity-60 font-mono">{r.sub}</span></button>
                                    ))}
                                </div>
                            </div>

                            {/* Decades */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Década</h4>
                                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                    <button onClick={() => setYearRange({ min: 1900, max: new Date().getFullYear() + 5 })} className={cn("px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap", yearRange.min === 1900 ? "bg-white text-black border-white" : "bg-surface border-white/10 text-gray-400")}>Todas</button>
                                    {[2020, 2010, 2000, 1990, 1980, 1970].map(decade => { const isSelected = yearRange.min === decade && yearRange.max === decade + 9; return (<button key={decade} onClick={() => setYearRange(isSelected ? { min: 1900, max: new Date().getFullYear() + 5 } : { min: decade, max: decade + 9 })} className={cn("px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap", isSelected ? "bg-primary text-black border-primary" : "bg-surface border-white/10 text-gray-400 hover:text-white")}>{decade}s</button>); })}
                                </div>
                            </div>

                            {/* Streaming Platforms */}
                            <StreamingProviderFilter
                                selected={selectedPlatforms}
                                onChange={setSelectedPlatforms}
                            />

                            {/* Genres */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Géneros</h4>
                                    {selectedGenres.length > 0 && <span className="text-xs text-primary">{selectedGenres.length} seleccionados</span>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {GENRES.map(g => (
                                        <FilterChip
                                            key={g.id}
                                            label={`${g.emoji} ${g.name}`}
                                            isSelected={selectedGenres.includes(g.id)}
                                            onClick={() => setSelectedGenres(prev => prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id])}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button onClick={clearFilters} className="flex-1 py-3.5 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors border border-white/10">Limpiar</button>
                                <button onClick={() => setIsFilterOpen(false)} className="flex-[2] py-3.5 bg-primary text-black rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all">Ver Resultados</button>
                            </div>
                        </div>
                    </BottomSheet>, document.body
                )
            }

            <ManageListMembersModal
                isOpen={isManageMembersOpen}
                onClose={() => setIsManageMembersOpen(false)}
                list={currentCustomList}
            />

            <CreateListModal
                isOpen={isCreateListOpen}
                onClose={() => setIsCreateListOpen(false)}
                onCreated={(newListId) => setSelectedListId(newListId)}
            />
        </div >
    );
};

export default LibraryView;
