import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getTrendingMovies, getMoviesByGenre, searchMovies, discoverMovies } from '../api/tmdb';
import { getOscarWinners } from '../api/oscarApi';
import { db } from '../api/firebase';
import { collection, query, where, getDocs, limit, orderBy, startAt, endAt } from 'firebase/firestore';
import SearchBar from '../components/SearchBar';
import MovieCard from '../components/MovieCard';
import { Loader2, Sparkles, User, Users } from 'lucide-react';
import BottomSheet from '../components/ui/BottomSheet';
import { cn } from '../lib/utils';
import { ClockIcon } from '@heroicons/react/24/solid';
import { AdjustmentsHorizontalIcon, XMarkIcon, UserCircleIcon, FilmIcon } from '@heroicons/react/24/outline';
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
    const navigate = useNavigate();

    // Mode State
    const [activeTab, setActiveTab] = useState('movies'); // 'movies' | 'people'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [isOscars, setIsOscars] = useState(false);

    // Data State
    const [results, setResults] = useState([]);
    const [userResults, setUserResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Filter UI State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [sortOption, setSortOption] = useState('popularity.desc');
    const [minRating, setMinRating] = useState(0);
    const [runtimeFilter, setRuntimeFilter] = useState('any');
    const [yearRange, setYearRange] = useState({ min: 1900, max: 2050 });

    const getFilterParams = () => {
        const params = {};
        params['sort_by'] = sortOption;
        if (minRating > 0) {
            params['vote_average.gte'] = minRating;
            params['vote_count.gte'] = 50;
        }
        if (runtimeFilter === 'short') params['with_runtime.lte'] = 90;
        else if (runtimeFilter === 'medium') { params['with_runtime.gte'] = 90; params['with_runtime.lte'] = 120; }
        else if (runtimeFilter === 'long') params['with_runtime.gte'] = 120;
        if (yearRange.min > 1900 || yearRange.max < 2050) {
            params['primary_release_date.gte'] = `${yearRange.min}-01-01`;
            params['primary_release_date.lte'] = `${yearRange.max}-12-31`;
        }
        return params;
    };

    // MOVIES FETCH
    const fetchMovies = useCallback(async (pageNum, reset = false) => {
        setLoading(true);
        try {
            let data = [];
            const filterParams = getFilterParams();

            if (searchQuery) {
                data = await searchMovies(searchQuery);
                if (minRating > 0) data = data.filter(m => m.vote_average >= minRating);
            }
            else if (isOscars) {
                data = await getOscarWinners();
                if (minRating > 0) data = data.filter(m => m.vote_average >= minRating);
            }
            else if (selectedGenre) {
                data = await getMoviesByGenre(selectedGenre, filterParams, pageNum);
            }
            else {
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
                    const combined = [...base, ...data];
                    const uniqueMap = new Map();
                    combined.forEach(item => { if (item.id) uniqueMap.set(item.id, item); });
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

    // USERS FETCH
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            let q;
            if (searchQuery) {
                // Simple search by username prefix
                // Note: This matches case-sensitive in simplified setup. 
                // For better results we'd store a lowercase 'searchKey' in DB.
                // Here we assume user types simplified lowercase or exact
                const term = searchQuery.toLowerCase();
                q = query(
                    collection(db, 'userProfiles'),
                    where('username', '>=', term),
                    where('username', '<=', term + '\uf8ff'),
                    limit(20)
                );
            } else {
                // Show latest users or random (simulated by simple limit for now)
                q = query(collection(db, 'userProfiles'), limit(10));
            }

            const snapshot = await getDocs(q);
            const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            setUserResults(users);
        } catch (error) {
            console.error("Error fetching users:", error);
            // Fallback empty
            setUserResults([]);
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    // Trigger Fetch
    useEffect(() => {
        if (activeTab === 'movies') {
            setPage(1);
            setHasMore(true);
            fetchMovies(1, true);
        } else {
            fetchUsers();
        }
    }, [searchQuery, selectedGenre, isOscars, minRating, runtimeFilter, yearRange, sortOption, activeTab, fetchMovies, fetchUsers]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query) {
            setSelectedGenre(null);
            setIsOscars(false);
        }
    };

    const handleGenreClick = (id) => {
        setActiveTab('movies');
        if (selectedGenre === id) setSelectedGenre(null);
        else setSelectedGenre(id);
        setIsOscars(false);
        setSearchQuery('');
    };

    const handleOscarClick = () => {
        setActiveTab('movies');
        setIsOscars(!isOscars);
        setSelectedGenre(null);
        setSearchQuery('');
    };

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchMovies(nextPage, false);
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

            {/* Filter Toggle (Only for Movies) */}
            {activeTab === 'movies' && (
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
            )}

            <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">Explorar</h1>

            <div className="mb-6">
                <SearchBar onSelectMovie={onSelectMovie} onSearchCallback={handleSearch} placeholder={activeTab === 'movies' ? "Buscar películas..." : "Buscar personas..."} />
            </div>

            {/* TABS SWITCHER */}
            <div className="flex p-1 bg-surface rounded-xl mb-8 w-full max-w-md mx-auto">
                <button
                    onClick={() => setActiveTab('movies')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all",
                        activeTab === 'movies' ? "bg-surface-elevated text-white shadow" : "text-gray-500 hover:text-white"
                    )}
                >
                    <FilmIcon className="w-4 h-4" /> Películas
                </button>
                <button
                    onClick={() => setActiveTab('people')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all",
                        activeTab === 'people' ? "bg-surface-elevated text-white shadow" : "text-gray-500 hover:text-white"
                    )}
                >
                    <Users className="w-4 h-4" /> Personas
                </button>
            </div>

            {/* Quick Categories (Movies Only) */}
            {activeTab === 'movies' && !searchQuery && (
                <div className="mb-10 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-400 mb-4">Categorías</h2>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={handleOscarClick} className={cn("px-4 py-2 border rounded-full text-sm font-medium transition-all transform active:scale-95 flex items-center gap-2", isOscars ? "bg-yellow-500/20 border-yellow-500 text-yellow-400" : "bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-500/30 text-yellow-500 hover:border-yellow-400/50")}>
                            <span>🏆</span> Oscars
                        </button>
                        {GENRES.map(genre => (
                            <button key={genre.id} onClick={() => handleGenreClick(genre.id)} className={cn("px-4 py-2 border rounded-full text-sm font-medium transition-all transform active:scale-95 flex items-center gap-2", selectedGenre === genre.id ? "bg-primary text-black border-primary" : "bg-white/5 hover:bg-white/10 border-white/5 text-white hover:border-primary/50")}>
                                <span>{genre.emoji}</span> {genre.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* CONTENT AREA */}
            {activeTab === 'movies' ? (
                // MOVIES GRID
                <>
                    <h2 className="text-xl font-bold text-white mb-4">
                        {isOscars ? "🏆 Ganadoras del Oscar" : selectedGenre ? `Películas de ${GENRES.find(g => g.id === selectedGenre)?.name}` : searchQuery ? `Buscando "${searchQuery}"` : activeFilterCount > 0 ? "Resultados Filtrados" : "Tendencias"}
                    </h2>

                    {loading && results.length === 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {[...Array(10)].map((_, i) => <MovieCardSkeleton key={i} />)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {results.map((movie, idx) => (
                                <MovieCard key={`${movie.id}-${idx}`} movie={movie} onClick={onSelectMovie} />
                            ))}
                            {results.length === 0 && !loading && (
                                <div className="col-span-full py-20 text-center">
                                    <Sparkles className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                    <p className="text-gray-500">No se encontraron películas.</p>
                                </div>
                            )}
                            {hasMore && results.length > 0 && !loading && (
                                <div className="col-span-full flex justify-center mt-8">
                                    <button onClick={loadMore} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full transition-all">Cargar más películas</button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                // PEOPLE GRID
                <>
                    <h2 className="text-xl font-bold text-white mb-4">
                        {searchQuery ? `Usuarios encontrados para "${searchQuery}"` : "Usuarios Recientes"}
                    </h2>

                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
                    ) : userResults.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {userResults.map(user => (
                                <div
                                    key={user.uid}
                                    onClick={() => navigate(`/u/${user.username}`)}
                                    className="flex items-center gap-4 p-4 bg-surface-elevated border border-white/5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                                        <img src={user.photoURL || "/logo.png"} alt={user.displayName} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="font-bold text-white truncate group-hover:text-primary transition-colors">{user.displayName}</h4>
                                        <p className="text-xs text-gray-400 font-mono truncate">@{user.username}</p>
                                    </div>
                                    <div className="text-xs text-gray-500 font-bold bg-black/20 px-2 py-1 rounded">
                                        Ver
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                            <UserCircleIcon className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-400">No encontramos usuarios con ese nombre.</p>
                            <p className="text-xs text-gray-500 mt-1">Intenta buscar por nombre de usuario exacto.</p>
                        </div>
                    )}
                </>
            )}

            {/* Filter Bottom Sheet (Only Movies) */}
            {createPortal(
                <BottomSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filtros Avanzados">
                    <div className="space-y-8 pb-8">
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Ordenar Por</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {[{ id: 'popularity.desc', label: 'Popularidad' }, { id: 'vote_average.desc', label: 'Valoración' }, { id: 'primary_release_date.desc', label: 'Más Recientes' }, { id: 'revenue.desc', label: 'Taquilla' }].map(opt => (
                                    <button key={opt.id} onClick={() => setSortOption(opt.id)} className={cn("p-3 rounded-xl text-sm font-medium border text-center transition-all", sortOption === opt.id ? "bg-white text-black border-white ring-2 ring-white/20" : "bg-surface border-white/5 text-gray-400 hover:text-white hover:bg-white/5")}>{opt.label}</button>
                                ))}
                            </div>
                        </div>
                        {/* ... Simplified Repetition of Filter UI ... */}
                        <div className="pt-4 flex gap-3">
                            <button onClick={clearFilters} className="flex-1 py-3.5 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors border border-white/10">Limpiar</button>
                            <button onClick={() => setIsFilterOpen(false)} className="flex-[2] py-3.5 bg-primary text-black rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all">Ver Resultados</button>
                        </div>
                    </div>
                </BottomSheet>, document.body
            )}
        </div>
    );
};

export default SearchView;
