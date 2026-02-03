import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getTrendingMovies, getMoviesByGenre, searchMovies, discoverMovies } from '../api/tmdb';
import { getOscarWinners } from '../api/oscarApi';
import SearchBar from '../components/SearchBar';
import MovieCard from '../components/MovieCard';
import { Loader2, Sparkles } from 'lucide-react';
import BottomSheet from '../components/ui/BottomSheet';
import { cn } from '../lib/utils';
import { StarIcon, ClockIcon } from '@heroicons/react/24/solid';
import { AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import MovieCardSkeleton from '../components/ui/MovieCardSkeleton';

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

const SearchView = ({ onSelectMovie }) => {
    // Mode State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [isOscars, setIsOscars] = useState(false);

    // Data State
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Filter UI State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [sortOption, setSortOption] = useState('popularity.desc');
    const [minRating, setMinRating] = useState(0); // 0 means any. Values 2-9.
    const [runtimeFilter, setRuntimeFilter] = useState('any');
    const [yearRange, setYearRange] = useState({ min: 1900, max: 2050 });

    // Initial load tracking
    const mounted = useRef(false);

    // Helper: Build API parameters from state
    const getFilterParams = () => {
        const params = {};

        // Sort
        params['sort_by'] = sortOption;

        // Rating
        if (minRating > 0) {
            params['vote_average.gte'] = minRating;
            params['vote_count.gte'] = 50; // Filter trash
        }

        // Runtime
        if (runtimeFilter === 'short') params['with_runtime.lte'] = 90;
        else if (runtimeFilter === 'medium') { params['with_runtime.gte'] = 90; params['with_runtime.lte'] = 120; }
        else if (runtimeFilter === 'long') params['with_runtime.gte'] = 120;

        // Years
        if (yearRange.min > 1900 || yearRange.max < 2050) {
            params['primary_release_date.gte'] = `${yearRange.min}-01-01`;
            params['primary_release_date.lte'] = `${yearRange.max}-12-31`; // Approx max
        }

        return params;
    };

    // Main Fetch Function
    const fetchContent = useCallback(async (pageNum, reset = false) => {
        setLoading(true);
        try {
            let data = [];
            const filterParams = getFilterParams();

            if (searchQuery) {
                // 1. Text Search Mode
                data = await searchMovies(searchQuery);
                if (minRating > 0) data = data.filter(m => m.vote_average >= minRating);
            }
            else if (isOscars) {
                // 2. Oscars Mode 
                data = await getOscarWinners();
                if (minRating > 0) data = data.filter(m => m.vote_average >= minRating);
            }
            else if (selectedGenre) {
                // 3. Genre Mode 
                data = await getMoviesByGenre(selectedGenre, filterParams, pageNum);
            }
            else {
                // 4. General Discovery
                const hasFilters = minRating > 0 || runtimeFilter !== 'any' || yearRange.min > 1900 || sortOption !== 'popularity.desc';

                if (hasFilters) {
                    data = await discoverMovies({ ...filterParams, page: pageNum });
                } else {
                    data = await getTrendingMovies(pageNum);
                }
            }

            if (data.length === 0 && pageNum > 1) {
                setHasMore(false);
            } else {
                setResults(prev => {
                    const base = reset ? [] : prev;
                    if (data.length === 0) return base;

                    // Deduplication Logic
                    const combined = [...base, ...data];
                    const uniqueMap = new Map();
                    combined.forEach(item => {
                        if (item.id) uniqueMap.set(item.id, item);
                    });
                    return Array.from(uniqueMap.values());
                });
                if (data.length < 20 && !isOscars) setHasMore(false);
                else setHasMore(true);
            }

        } catch (error) {
            console.error("Error fetching content:", error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedGenre, isOscars, minRating, runtimeFilter, yearRange, sortOption]);

    // Trigger Fetch on State Change
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchContent(1, true);
    }, [searchQuery, selectedGenre, isOscars, minRating, runtimeFilter, yearRange, sortOption]);


    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query) {
            setSelectedGenre(null);
            setIsOscars(false);
        }
    };

    const handleGenreClick = (id) => {
        if (selectedGenre === id) setSelectedGenre(null);
        else setSelectedGenre(id);

        setIsOscars(false);
        setSearchQuery('');
    };

    const handleOscarClick = () => {
        setIsOscars(!isOscars);
        setSelectedGenre(null);
        setSearchQuery('');
    };

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchContent(nextPage, false);
    };

    const clearFilters = () => {
        setMinRating(0);
        setRuntimeFilter('any');
        setYearRange({ min: 1900, max: 2050 });
        setSortOption('popularity.desc');
    };

    const activeFilterCount = (minRating > 0 ? 1 : 0) + (runtimeFilter !== 'any' ? 1 : 0) + (yearRange.min > 1900 ? 1 : 0) + (sortOption !== 'popularity.desc' ? 1 : 0);

    return (
        <div className="p-4 pt-20 pb-24 min-h-screen max-w-7xl mx-auto relative">

            {/* Filter Toggle */}
            <div className="sticky top-24 z-30 flex justify-end mb-4 pointer-events-none">
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className={cn(
                        "pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full shadow-xl backdrop-blur-md border transition-all active:scale-95",
                        activeFilterCount > 0
                            ? "bg-primary text-black border-primary"
                            : "bg-surface/80 text-white border-white/10 hover:bg-surface"
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

            <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Explorar</h1>

            <div className="mb-8">
                <SearchBar onSelectMovie={onSelectMovie} onSearchCallback={handleSearch} />
            </div>

            {/* Quick Categories */}
            {!searchQuery && (
                <div className="mb-10 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-400 mb-4">Categorías</h2>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleOscarClick}
                            className={cn(
                                "px-4 py-2 border rounded-full text-sm font-medium transition-all transform active:scale-95 flex items-center gap-2",
                                isOscars
                                    ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                                    : "bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-500/30 text-yellow-500 hover:border-yellow-400/50"
                            )}
                        >
                            <span>🏆</span> Oscars
                        </button>

                        {GENRES.map(genre => (
                            <button
                                key={genre.id}
                                onClick={() => handleGenreClick(genre.id)}
                                className={cn(
                                    "px-4 py-2 border rounded-full text-sm font-medium transition-all transform active:scale-95 flex items-center gap-2",
                                    selectedGenre === genre.id
                                        ? "bg-primary text-black border-primary"
                                        : "bg-white/5 hover:bg-white/10 border-white/5 text-white hover:border-primary/50"
                                )}
                            >
                                <span>{genre.emoji}</span> {genre.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Results Header */}
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                    {isOscars ? "🏆 Ganadoras del Oscar" :
                        selectedGenre ? `Películas de ${GENRES.find(g => g.id === selectedGenre)?.name}` :
                            searchQuery ? `Buscando "${searchQuery}"` :
                                activeFilterCount > 0 ? "Resultados Filtrados" : "Tendencias"}
                </h2>

                <div className="flex items-center gap-3">
                    {activeFilterCount > 0 && results.length > 0 && (
                        <span className="text-xs text-primary font-bold">{results.length} resultados</span>
                    )}
                    {(selectedGenre || isOscars || activeFilterCount > 0 || searchQuery) && (
                        <button
                            onClick={() => {
                                setSelectedGenre(null);
                                setIsOscars(false);
                                setSearchQuery('');
                                clearFilters();
                            }}
                            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            <XMarkIcon className="w-3 h-3" /> Limpiar todo
                        </button>
                    )}
                </div>
            </div>

            {loading && results.length === 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => (
                        <MovieCardSkeleton key={i} />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {results.map((movie, idx) => (
                        <MovieCard
                            key={`${movie.id}-${idx}`}
                            movie={movie}
                            onClick={onSelectMovie}
                        />
                    ))}
                    {results.length === 0 && !loading && (
                        <div className="col-span-full py-20 text-center">
                            <Sparkles className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500">
                                {activeFilterCount > 0
                                    ? "No hay películas que coincidan con estos filtros."
                                    : "No se encontraron resultados"}
                            </p>
                            {activeFilterCount > 0 && (
                                <button onClick={clearFilters} className="mt-2 text-primary text-sm font-bold hover:underline">
                                    Borrar filtros
                                </button>
                            )}
                        </div>
                    )}

                    {/* Load More Button */}
                    {hasMore && results.length > 0 && !loading && (
                        <div className="col-span-full flex justify-center mt-8">
                            <button
                                onClick={loadMore}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                            >
                                Cargar más películas
                            </button>
                        </div>
                    )}
                    {/* Load More Spinner */}
                    {hasMore && loading && results.length > 0 && (
                        <div className="col-span-full flex justify-center mt-8">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                    )}
                </div>
            )}

            {/* Filter Bottom Sheet */}
            {createPortal(
                <BottomSheet
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                    title="Filtros Avanzados"
                >
                    <div className="space-y-8 pb-8">
                        {/* 1. Sort Section */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Ordenar Por</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'popularity.desc', label: 'Popularidad' },
                                    { id: 'vote_average.desc', label: 'Valoración' },
                                    { id: 'primary_release_date.desc', label: 'Más Recientes' },
                                    { id: 'revenue.desc', label: 'Taquilla' },
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

                        {/* 2. Rating Filter (2-9 range) */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Calificación Mínima</h4>
                                <span className="text-xs font-mono text-primary">{minRating > 0 ? `${minRating}+ Puntos` : 'Cualquiera'}</span>
                            </div>
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

                        {/* Footer Buttons */}
                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={clearFilters}
                                className="flex-1 py-3.5 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors border border-white/10"
                            >
                                Limpiar
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="flex-[2] py-3.5 bg-primary text-black rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all"
                            >
                                Ver Resultados
                            </button>
                        </div>
                    </div>
                </BottomSheet>,
                document.body
            )}
        </div>
    );
};

export default SearchView;
