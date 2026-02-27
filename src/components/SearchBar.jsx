import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { searchMovies, getPosterUrl } from '../api/tmdb';
import { useMovies } from '../contexts/MovieContext';

const SearchBar = ({ onSelectMovie, onSearchCallback }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (onSearchCallback) {
                onSearchCallback(query);
                // Assuming onSearchCallback handles its own loading/results/isOpen state
                // or that this component doesn't need to manage them when a callback is provided.
                // If local loading/results/isOpen management is still desired, it needs to be added here.
                setIsOpen(false); // Close dropdown if external search is used
                setResults([]); // Clear local results
            } else if (query.length >= 2) {
                setIsLoading(true);
                const data = await searchMovies(query);
                setResults(data.slice(0, 5));
                setIsLoading(false);
                setIsOpen(true);
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query, onSearchCallback]); // Added onSearchCallback to dependency array

    const handleSelect = (movie) => {
        onSelectMovie(movie);
        setIsOpen(false);
        setQuery('');
    };

    return (
        <div className="relative w-full max-w-md mx-auto z-50" ref={searchRef}>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                    type="text"
                    name="searchMovies"
                    id="search-movies-input"
                    className="block w-full pl-10 pr-10 py-3 border border-gray-700 rounded-full leading-5 bg-surface text-gray-100 placeholder-gray-400 focus:outline-none focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-all duration-300 shadow-md"
                    placeholder="Buscar películas..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                />
                {isLoading && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    </div>
                )}
                {!isLoading && query && (
                    <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer group/clear active:scale-90 transition-transform p-3"
                        onClick={() => { setQuery(''); setIsOpen(false); }}
                        aria-label="Borrar búsqueda"
                    >
                        <X className="h-5 w-5 text-gray-400 group-hover/clear:text-white transition-colors" />
                    </button>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute mt-2 w-full rounded-xl bg-surface bg-opacity-95 backdrop-blur-md shadow-2xl overflow-hidden border border-gray-800 animate-slide-up">
                    <ul className="max-h-96 overflow-y-auto divide-y divide-gray-800/50">
                        {results.map((movie) => (
                            <li
                                key={movie.id}
                                className="flex items-center p-3 hover:bg-white/5 cursor-pointer transition-colors"
                                onClick={() => handleSelect(movie)}
                            >
                                <img
                                    src={getPosterUrl(movie.poster_path, 'w92')}
                                    alt={movie.title}
                                    className="w-12 h-18 object-cover rounded-md shadow-sm"
                                />
                                <div className="ml-3 flex-1">
                                    <p className="text-sm font-medium text-white">{movie.title}</p>
                                    <p className="text-xs text-secondary">{movie.release_date ? movie.release_date.split('-')[0] : 'Unknown'}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
