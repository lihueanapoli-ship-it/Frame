import React, { useState } from 'react';
import { useMovies } from '../contexts/MovieContext';
import { useMovieFilter } from '../hooks/useMovieFilter';
import MovieCard from '../components/MovieCard';
import BottomSheet from '../components/ui/BottomSheet';
import { FilterChip } from '../components/ui/FilterChip';
import { createPortal } from 'react-dom';
import { AdjustmentsHorizontalIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { FilmIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

// Basic Genre List (In a real app, fetch from API)
const GENRES = [
    { id: 28, name: "Acción" },
    { id: 878, name: "Sci-Fi" },
    { id: 18, name: "Drama" },
    { id: 35, name: "Comedia" },
    { id: 27, name: "Terror" },
    { id: 10749, name: "Romance" },
    { id: 16, name: "Animación" }
];

const LibraryView = ({ onSelectMovie }) => {
    // State
    const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist' | 'watched'
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState('');

    // Filter States
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [sortOption, setSortOption] = useState('date_added'); // 'date_added', 'rating', 'year'

    // Data
    const { watchlist, watched } = useMovies();
    const rawMovies = activeTab === 'watchlist' ? watchlist : watched;

    // Smart Filtering Hook
    const { filteredMovies, totalCount } = useMovieFilter(rawMovies, {
        search: localSearch,
        status: 'all', // We pass 'all' since rawMovies is already filtered by tab
        sort: sortOption,
        genres: selectedGenres
    });

    const toggleGenre = (id) => {
        setSelectedGenres(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const clearFilters = () => {
        setSelectedGenres([]);
        setSortOption('date_added');
    };

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
                            "flex items-center justify-center w-12 h-12 rounded-xl border border-white/10 transition-colors",
                            (selectedGenres.length > 0 || sortOption !== 'date_added')
                                ? "bg-primary text-white border-primary"
                                : "bg-surface-elevated text-gray-400 hover:text-white"
                        )}
                    >
                        <AdjustmentsHorizontalIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Movie Grid */}
            <div className="space-y-4">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex justify-between items-center">
                    <span>{totalCount} Películas</span>
                    {(selectedGenres.length > 0) && <span className="text-primary truncate max-w-[150px]">Filtros activos</span>}
                </div>

                {totalCount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <FilmIcon className="w-16 h-16 text-gray-700 mb-4" />
                        <p className="text-gray-400">No se encontraron películas</p>
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
                                    rating={movie.rating}
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
                    title="Filtrar y Ordenar"
                >
                    <div className="space-y-8">
                        {/* Sort Section */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Ordenar Por</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'date_added', label: 'Agregadas recientemente' },
                                    { id: 'year', label: 'Año de lanzamiento' },
                                    { id: 'rating', label: 'Mejor calificadas' },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setSortOption(opt.id)}
                                        className={cn(
                                            "p-3 rounded-xl text-sm font-medium border border-white/5 text-left transition-all",
                                            sortOption === opt.id
                                                ? "bg-white text-black ring-2 ring-white"
                                                : "bg-surface hover:bg-white/5 text-gray-300"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Genre Section */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Géneros</h4>
                            <div className="flex flex-wrap gap-2">
                                {GENRES.map(g => (
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
                                className="flex-1 py-3.5 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors"
                            >
                                Limpiar todo
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="flex-[2] py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all"
                            >
                                Aplicar Filtros
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
