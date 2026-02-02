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
            console.log('[MovieContext] No user or db, clearing cloud state');
            setCloudWatchlist([]);
            setCloudWatched([]);
            return;
        }

        console.log('[MovieContext] Setting up Firebase listener for user:', user.uid);
        const userRef = doc(db, 'users', user.uid);

        // Real-time listener
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('[MovieContext] 📥 Received from Firebase:', {
                    watchlist: data.watchlist?.length || 0,
                    watched: data.watched?.length || 0
                });
                setCloudWatchlist(data.watchlist || []);
                setCloudWatched(data.watched || []);
            } else {
                console.log('[MovieContext] Document does not exist, creating with local data');
                // Create user doc if not exists, and strictly merge local data if present
                const initialData = {
                    watchlist: localWatchlist.length > 0 ? localWatchlist : [],
                    watched: localWatched.length > 0 ? localWatched : []
                };
                console.log('[MovieContext] Creating initial doc with:', {
                    watchlist: initialData.watchlist.length,
                    watched: initialData.watched.length
                });
                setDoc(userRef, initialData, { merge: true });
            }
        }, (error) => {
            console.error('[MovieContext] ❌ Firebase listener error:', error);
        });

        return () => {
            console.log('[MovieContext] Cleaning up Firebase listener');
            unsubscribe();
        };
    }, [user, db]); // localWatchlist/localWatched se usan solo en la creación inicial

    // Helpers to update Cloud
    const updateCloud = async (newWatchlist, newWatched) => {
        if (!user || !db) return;
        const userRef = doc(db, 'users', user.uid);
        try {
            // Use setDoc with merge instead of updateDoc
            // This works even if the document doesn't exist yet
            await setDoc(userRef, {
                watchlist: newWatchlist,
                watched: newWatched
            }, { merge: true });

            console.log('[MovieContext] ✅ Synced to cloud:', {
                watchlist: newWatchlist.length,
                watched: newWatched.length
            });
        } catch (e) {
            console.error("[MovieContext] ❌ Error syncing to cloud:", e);
            throw e; // Re-throw para que el catch en addToWatchlist funcione
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
