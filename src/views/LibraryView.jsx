import React, { useState, useEffect, useMemo } from 'react';
import { useMovies } from '../contexts/MovieContext';
import { useAuth } from '../contexts/AuthContext';
import { useLists } from '../contexts/ListContext';
import { useMovieFilter } from '../hooks/useMovieFilter';
import { getMovieDetails } from '../api/tmdb';
import { getCachedGenres } from '../utils/genreCache';
import MovieCard from '../components/MovieCard';
import BottomSheet from '../components/ui/BottomSheet';
import { createPortal } from 'react-dom';
import { AdjustmentsHorizontalIcon, MagnifyingGlassIcon, XMarkIcon, UserPlusIcon, TrashIcon, ChevronDownIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { FilmIcon } from '@heroicons/react/24/solid';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import UserSearchModal from '../components/ui/UserSearchModal';
import CreateListModal from '../components/ui/CreateListModal';

const LibraryView = ({ onSelectMovie }) => {
    // State
    const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist' | 'watched'
    const [selectedListId, setSelectedListId] = useState('watchlist');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isCreateListOpen, setIsCreateListOpen] = useState(false);

    // Filter States
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [sortOption, setSortOption] = useState('date_added');
    const [minRating, setMinRating] = useState(0);
    const [runtimeFilter, setRuntimeFilter] = useState('any');
    const [yearRange, setYearRange] = useState({ min: 1900, max: new Date().getFullYear() + 5 });

    // Data
    const { watchlist, watched, updateMovieMetadata } = useMovies();
    const { myLists, collabLists, addCollaborator, deleteList } = useLists();
    const { user, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const allListsDisplay = useMemo(() => [...myLists, ...collabLists], [myLists, collabLists]);

    const currentCustomList = useMemo(() => {
        if (selectedListId === 'watchlist') return null;
        return allListsDisplay.find(l => l.id === selectedListId);
    }, [selectedListId, allListsDisplay]);

    const rawMovies = useMemo(() => {
        if (activeTab === 'watched') return watched;
        if (selectedListId === 'watchlist') return watchlist;
        return currentCustomList?.movies || [];
    }, [activeTab, selectedListId, watchlist, watched, currentCustomList]);

    const handleInviteUser = async (selectedUser) => {
        if (!currentCustomList) return;
        await addCollaborator(currentCustomList.id, selectedUser.uid);
        alert(`¡${selectedUser.displayName} ahora puede editar esta lista!`);
    };

    const handleDeleteList = async () => {
        if (!currentCustomList) return;
        if (window.confirm("¿Estás seguro de que quieres eliminar esta lista?")) {
            await deleteList(currentCustomList.id);
            setSelectedListId('watchlist');
        }
    };

    // Derived logic for filters/repair omitted for brevity, same as previous
    const ratingSource = activeTab === 'watchlist' ? 'tmdb' : 'user';
    useEffect(() => { clearFilters(); }, [activeTab, selectedListId]);
    const { filteredMovies, totalCount } = useMovieFilter(rawMovies, {
        search: localSearch, status: 'all', sort: sortOption, genres: selectedGenres, minRating, runtime: runtimeFilter, yearRange, ratingSource
    });

    if (!user) return <div className="min-h-screen" />;

    const clearFilters = () => { setSelectedGenres([]); setSortOption('date_added'); setMinRating(0); setRuntimeFilter('any'); setYearRange({ min: 1900, max: new Date().getFullYear() + 5 }); };
    const activeFilterCount = (selectedGenres.length > 0 ? 1 : 0) + (minRating > 0 ? 1 : 0) + (runtimeFilter !== 'any' ? 1 : 0) + (sortOption !== 'date_added' ? 1 : 0);

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
                {/* 2. LIST SELECTOR */}
                {activeTab === 'watchlist' && (
                    <div className="relative z-10">
                        {/* Custom Dropdown Trigger */}
                        <div className="relative">
                            <select
                                value={selectedListId}
                                onChange={(e) => {
                                    if (e.target.value === 'new') {
                                        setIsCreateListOpen(true);
                                        // Reset to previous value or keep current? 
                                        // Ideally just trigger modal and don't change selection yet until created.
                                        // But native select needs a value.
                                        // Let's keep it simple: if 'new' is selected, open modal, select stays on what it was effectively because we don't update state to 'new' unless we want to show a 'creating...' state.
                                        // Actually, let's use a trick: Value is selectedListId. 
                                        // If user selects 'new', e.target.value is 'new'. We explicitly handle it.
                                    } else {
                                        setSelectedListId(e.target.value);
                                    }
                                }}
                                className="w-full appearance-none bg-[#111] border border-white/10 text-white rounded-xl py-3 pl-4 pr-10 text-sm font-medium focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                <option value="watchlist" className="bg-[#111] text-white">🎬 Mi Watchlist (General)</option>
                                <optgroup label="Mis Colecciones" className="bg-[#111] text-gray-400">
                                    {allListsDisplay.map(list => (
                                        <option key={list.id} value={list.id} className="bg-[#111] text-white">
                                            📑 {list.name} {list.ownerId !== user.uid ? '(Colaboración)' : ''}
                                        </option>
                                    ))}
                                </optgroup>
                                <option value="new" className="bg-[#111] text-primary font-bold">+ Crear Nueva Lista...</option>
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        {currentCustomList && currentCustomList.ownerId === user.uid && (
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setIsInviteModalOpen(true)} className="flex-1 py-2 bg-surface-elevated border border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 flex items-center justify-center gap-2">
                                    <UserPlusIcon className="w-4 h-4" /> Invitar
                                </button>
                                <button onClick={handleDeleteList} className="w-10 flex items-center justify-center bg-surface-elevated border border-white/10 rounded-lg hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-colors text-gray-400">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
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
                    <span>{totalCount} Películas {currentCustomList ? `en ${currentCustomList.name}` : ''}</span>
                    {activeFilterCount > 0 && <button onClick={clearFilters} className="text-primary flex items-center gap-1 hover:underline"><XMarkIcon className="w-3 h-3" /> Limpiar filtros</button>}
                </div>
                {/* ... Grid logic same as before ... */}
                {totalCount === 0 ? (
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
                        {filteredMovies.map(movie => (
                            <motion.div key={movie.id} variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
                                <MovieCard movie={movie} onClick={onSelectMovie} rating={activeTab === 'watched' ? movie.rating : undefined} />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* MODALS */}
            {createPortal(
                <BottomSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filtros">
                    {/* Simplified Filter UI Content */}
                    <div className="space-y-8 pb-8">
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Ordenar Por</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {[{ id: 'date_added', label: 'Recientes' }, { id: 'year', label: 'Año' }, { id: 'rating', label: 'Valoración' }, { id: 'runtime', label: 'Duración' }].map(opt => (
                                    <button key={opt.id} onClick={() => setSortOption(opt.id)} className={cn("p-3 rounded-xl text-sm font-medium border text-center transition-all", sortOption === opt.id ? "bg-white text-black border-white ring-2 ring-white/20" : "bg-surface border-white/5 text-gray-400 hover:text-white hover:bg-white/5")}>{opt.label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button onClick={clearFilters} className="flex-1 py-3.5 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors border border-white/10">Limpiar todo</button>
                            <button onClick={() => setIsFilterOpen(false)} className="flex-[2] py-3.5 bg-primary text-black rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all">Ver Resultados</button>
                        </div>
                    </div>
                </BottomSheet>, document.body
            )}

            <UserSearchModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onSelectUser={handleInviteUser} />

            <CreateListModal
                isOpen={isCreateListOpen}
                onClose={() => setIsCreateListOpen(false)}
                onCreated={(newListId) => setSelectedListId(newListId)}
            />
        </div>
    );
};

export default LibraryView;
