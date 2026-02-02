import React, { createContext, useContext, useEffect, useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useAuth } from './AuthContext';
import { db } from '../api/firebase';
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';

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
    // Only use cloud if user is logged in AND db is configured
    const isCloud = !!user && !!db;

    // Derived State (Source of Truth)
    const watchlist = isCloud ? cloudWatchlist : localWatchlist;
    const watched = isCloud ? cloudWatched : localWatched;

    // Sync Cloud Data
    useEffect(() => {
        if (!user || !db) {
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
    }, [user]);

    // Helpers to update Cloud
    const updateCloud = async (newWatchlist, newWatched) => {
        if (!user || !db) return;
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
        if (watchlist.some(m => m.id === movie.id) || watched.some(m => m.id === movie.id)) {
            console.log('[MovieContext] Movie already in watchlist or watched');
            return;
        }

        const newWatchlist = [...watchlist, movieToAdd];

        if (isCloud) {
            // ✨ OPTIMISTIC UI: Update state immediately
            setCloudWatchlist(newWatchlist);

            // Then sync to cloud in background
            updateCloud(newWatchlist, watched).catch(error => {
                console.error('[MovieContext] Failed to sync watchlist:', error);
                // Rollback on error
                setCloudWatchlist(watchlist);
                // TODO: Show toast notification to user
            });
        } else {
            setLocalWatchlist(newWatchlist);
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
            // ✨ OPTIMISTIC UI: Update state immediately
            const prevWatchlist = cloudWatchlist;
            const prevWatched = cloudWatched;

            setCloudWatchlist(newWatchlist);
            setCloudWatched(newWatched);

            // Then sync to cloud
            updateCloud(newWatchlist, newWatched).catch(error => {
                console.error('[MovieContext] Failed to sync watched:', error);
                // Rollback
                setCloudWatchlist(prevWatchlist);
                setCloudWatched(prevWatched);
            });
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
            // ✨ OPTIMISTIC UI: Update state immediately
            const prevWatchlist = cloudWatchlist;
            const prevWatched = cloudWatched;

            setCloudWatchlist(newWatchlist);
            setCloudWatched(newWatched);

            // Then sync to cloud
            updateCloud(newWatchlist, newWatched).catch(error => {
                console.error('[MovieContext] Failed to remove movie:', error);
                // Rollback
                setCloudWatchlist(prevWatchlist);
                setCloudWatched(prevWatched);
            });
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
