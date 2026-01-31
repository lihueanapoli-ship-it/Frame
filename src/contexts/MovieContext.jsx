import React, { createContext, useContext, useEffect, useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useAuth } from './AuthContext';
import { db } from '../api/firebase';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';

const MovieContext = createContext();

export const useMovies = () => useContext(MovieContext);

export const MovieProvider = ({ children }) => {
    // Local Storage (Fallback)
    const [localWatchlist, setLocalWatchlist] = useLocalStorage('cinetrack_watchlist', []);
    const [localWatched, setLocalWatched] = useLocalStorage('cinetrack_watched', []);

    // Cloud State
    const [cloudWatchlist, setCloudWatchlist] = useState([]);
    const [cloudWatched, setCloudWatched] = useState([]);

    const { user } = useAuth();
    const isCloud = !!user;

    // Derived State (Source of Truth)
    const watchlist = isCloud ? cloudWatchlist : localWatchlist;
    const watched = isCloud ? cloudWatched : localWatched;

    // Sync Cloud Data
    useEffect(() => {
        if (!user) {
            setCloudWatchlist([]);
            setCloudWatched([]);
            return;
        }

        const userRef = doc(db, 'users', user.uid);

        // Real-time listener
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCloudWatchlist(data.watchlist || []);
                setCloudWatched(data.watched || []);
            } else {
                // Create user doc if not exists, and strictly merge local data if present
                const initialData = {
                    watchlist: localWatchlist.length > 0 ? localWatchlist : [],
                    watched: localWatched.length > 0 ? localWatched : []
                };
                setDoc(userRef, initialData, { merge: true });
            }
        });

        return () => unsubscribe();
    }, [user]); // Run when user logs in/out

    // Helpers to update Cloud
    const updateCloud = async (newWatchlist, newWatched) => {
        if (!user) return;
        const userRef = doc(db, 'users', user.uid);
        try {
            await updateDoc(userRef, {
                watchlist: newWatchlist,
                watched: newWatched
            });
        } catch (e) {
            console.error("Error syncing to cloud:", e);
        }
    };

    const addToWatchlist = (movie) => {
        // Build new object
        const movieToAdd = { ...movie, addedAt: new Date().toISOString() };

        // Avoid duplicates
        if (watchlist.some(m => m.id === movie.id) || watched.some(m => m.id === movie.id)) return;

        if (isCloud) {
            // Optimistic update handled by listener usually, but here we can just wait for listener or update locally to feel fast?
            // Since we use onSnapshot, updating the DB triggers the state update.
            const newWatchlist = [...watchlist, movieToAdd];
            updateCloud(newWatchlist, watched);
        } else {
            setLocalWatchlist([...localWatchlist, movieToAdd]);
        }
    };

    const addToWatched = (movie, rating = 0) => {
        // Filter out from watchlist
        const newWatchlist = watchlist.filter(m => m.id !== movie.id);

        // Add/Update watched
        let newWatched;
        const existingIndex = watched.findIndex(m => m.id === movie.id);

        if (existingIndex >= 0) {
            const updatedItem = { ...watched[existingIndex], rating };
            newWatched = [...watched];
            newWatched[existingIndex] = updatedItem;
        } else {
            const movieToAdd = { ...movie, rating, watchedAt: new Date().toISOString() };
            newWatched = [...watched, movieToAdd];
        }

        if (isCloud) {
            updateCloud(newWatchlist, newWatched);
        } else {
            setLocalWatchlist(newWatchlist);
            setLocalWatched(newWatched);
        }
    };

    const moveFromWatchlistToWatched = (movieId, rating = 0) => {
        const movie = watchlist.find(m => m.id === movieId);
        if (movie) {
            addToWatched(movie, rating);
        }
    };

    const removeMovie = (movieId) => {
        const newWatchlist = watchlist.filter(m => m.id !== movieId);
        const newWatched = watched.filter(m => m.id !== movieId);

        if (isCloud) {
            updateCloud(newWatchlist, newWatched);
        } else {
            setLocalWatchlist(newWatchlist);
            setLocalWatched(newWatched);
        }
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
