import React, { createContext, useContext } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

const MovieContext = createContext();

export const useMovies = () => useContext(MovieContext);

export const MovieProvider = ({ children }) => {
    const [watchlist, setWatchlist] = useLocalStorage('cinetrack_watchlist', []);
    const [watched, setWatched] = useLocalStorage('cinetrack_watched', []);

    const addToWatchlist = (movie) => {
        // Avoid duplicates
        if (!watchlist.some((m) => m.id === movie.id) && !watched.some((m) => m.id === movie.id)) {
            setWatchlist([...watchlist, { ...movie, addedAt: new Date().toISOString() }]);
        }
    };

    const addToWatched = (movie, rating = 0) => {
        // Remove from watchlist if exists
        setWatchlist(watchlist.filter((m) => m.id !== movie.id));

        // Add to watched if not exists, or update if exists
        const existing = watched.find((m) => m.id === movie.id);
        if (existing) {
            setWatched(watched.map(m => m.id === movie.id ? { ...m, rating } : m));
        } else {
            setWatched([...watched, { ...movie, rating, watchedAt: new Date().toISOString() }]);
        }
    };

    const moveFromWatchlistToWatched = (movieId, rating = 0) => {
        const movie = watchlist.find(m => m.id === movieId);
        if (movie) {
            addToWatched(movie, rating);
        }
    };

    const removeMovie = (movieId) => {
        setWatchlist(watchlist.filter(m => m.id !== movieId));
        setWatched(watched.filter(m => m.id !== movieId));
    };

    const isWatched = (id) => watched.some(m => m.id === id);
    const isInWatchlist = (id) => watchlist.some(m => m.id === id);

    return (
        <MovieContext.Provider value={{
            watchlist,
            watched,
            addToWatchlist,
            addToWatched,
            moveFromWatchlistToWatched,
            removeMovie,
            isWatched,
            isInWatchlist
        }}>
            {children}
        </MovieContext.Provider>
    );
};
