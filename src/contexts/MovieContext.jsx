import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useAuth } from './AuthContext';
import { db } from '../api/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const MovieContext = createContext();

export const useMovies = () => useContext(MovieContext);

export const MovieProvider = ({ children }) => {
    // Local Storage (Fallback)
    const [localWatchlist, setLocalWatchlist] = useLocalStorage('cinetrack_watchlist', []);
    const [localWatched, setLocalWatched] = useLocalStorage('cinetrack_watched', []);

    // Cloud State
    const [cloudWatchlist, setCloudWatchlist] = useState([]);
    const [cloudWatched, setCloudWatched] = useState([]);

    // Sync state - prevents race conditions
    const isSyncingRef = useRef(false);
    const syncTimeoutRef = useRef(null);

    const { user } = useAuth();
    const isCloud = !!user && !!db;

    // Derived State (Source of Truth)
    const watchlist = isCloud ? cloudWatchlist : localWatchlist;
    const watched = isCloud ? cloudWatched : localWatched;

    // ========================================
    // FIREBASE SYNC
    // ========================================
    useEffect(() => {
        if (!user || !db) {
            console.log('[MovieContext] 🚫 No user or db');
            setCloudWatchlist([]);
            setCloudWatched([]);
            return;
        }

        console.log('[MovieContext] 🔥 Initializing Firebase sync for:', user.uid);
        const userRef = doc(db, 'users', user.uid);

        const unsubscribe = onSnapshot(
            userRef,
            (docSnap) => {
                // Skip updates if we're currently syncing
                if (isSyncingRef.current) {
                    console.log('[MovieContext] ⏸️ Skipping listener update (sync in progress)');
                    return;
                }

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    console.log('[MovieContext] 📥 Loaded from Firebase:', {
                        watchlist: data.watchlist?.length || 0,
                        watched: data.watched?.length || 0
                    });

                    setCloudWatchlist(data.watchlist || []);
                    setCloudWatched(data.watched || []);
                } else {
                    // Create initial document
                    console.log('[MovieContext] 📝 Creating initial document');
                    const initialData = {
                        watchlist: localWatchlist.length > 0 ? localWatchlist : [],
                        watched: localWatched.length > 0 ? localWatched : [],
                        createdAt: new Date().toISOString()
                    };

                    setDoc(userRef, initialData, { merge: true })
                        .then(() => console.log('[MovieContext] ✅ Initial document created'))
                        .catch((err) => console.error('[MovieContext] ❌ Error creating document:', err));
                }
            },
            (error) => {
                console.error('[MovieContext] ❌ Listener error:', error);
            }
        );

        return () => {
            console.log('[MovieContext] 🧹 Cleanup');
            unsubscribe();
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [user, db]);

    // ========================================
    // CLOUD SYNC FUNCTION
    // ========================================
    const syncToCloud = async (newWatchlist, newWatched) => {
        if (!user || !db) {
            console.log('[MovieContext] ⚠️ Cannot sync: no user/db');
            return;
        }

        // Set syncing flag
        isSyncingRef.current = true;

        // Clear any existing timeout
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        const userRef = doc(db, 'users', user.uid);

        try {
            console.log('[MovieContext] 💾 Syncing to Firebase:', {
                watchlist: newWatchlist.length,
                watched: newWatched.length
            });

            await setDoc(userRef, {
                watchlist: newWatchlist,
                watched: newWatched,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            console.log('[MovieContext] ✅ Sync successful');

        } catch (error) {
            console.error('[MovieContext] ❌ Sync failed:', error);
            throw error;
        } finally {
            // Release sync flag after 2 seconds to ensure Firebase propagation
            syncTimeoutRef.current = setTimeout(() => {
                isSyncingRef.current = false;
                console.log('[MovieContext] 🔓 Sync flag released');
            }, 2000);
        }
    };

    // ========================================
    // HELPER: Strip unnecessary data
    // Firebase has 1MB limit per document
    // We only need: id, title, poster_path, rating, dates
    // ========================================
    const stripMovieData = (movie) => {
        return {
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path || null,
            release_date: movie.release_date || null,
            // Keep these if they exist
            ...(movie.rating !== undefined && { rating: movie.rating }),
            ...(movie.addedAt && { addedAt: movie.addedAt }),
            ...(movie.watchedAt && { watchedAt: movie.watchedAt })
        };
    };

    // ========================================
    // ADD TO WATCHLIST
    // ========================================
    const addToWatchlist = (movie) => {
        const movieToAdd = {
            ...stripMovieData(movie),  // ✨ Only essential data
            addedAt: new Date().toISOString()
        };

        // Check duplicates
        if (watchlist.some(m => m.id === movie.id) || watched.some(m => m.id === movie.id)) {
            console.log('[MovieContext] ⚠️ Movie already exists:', movie.title);
            return;
        }

        const newWatchlist = [...watchlist, movieToAdd];
        console.log('[MovieContext] ➕ Adding to watchlist:', movie.title);

        if (isCloud) {
            // Update state immediately (optimistic UI)
            setCloudWatchlist(newWatchlist);

            // Sync to cloud
            syncToCloud(newWatchlist, watched).catch(error => {
                console.error('[MovieContext] ❌ Rollback:', error);
                // Rollback on error
                setCloudWatchlist(watchlist);
            });
        } else {
            setLocalWatchlist(newWatchlist);
        }
    };

    // ========================================
    // ADD TO WATCHED
    // ========================================
    const addToWatched = (movie, rating = 0) => {
        const newWatchlist = watchlist.filter(m => m.id !== movie.id);
        let newWatched;

        const existingIndex = watched.findIndex(m => m.id === movie.id);

        if (existingIndex >= 0) {
            // Update existing
            newWatched = [...watched];
            newWatched[existingIndex] = {
                ...newWatched[existingIndex],
                rating
            };
            console.log('[MovieContext] 🔄 Updating rating:', movie.title, rating);
        } else {
            // Add new
            const movieToAdd = {
                ...stripMovieData(movie),  // ✨ Only essential data
                rating,
                watchedAt: new Date().toISOString()
            };
            newWatched = [...watched, movieToAdd];
            console.log('[MovieContext] ✅ Marking as watched:', movie.title);
        }

        if (isCloud) {
            // Store previous state for rollback
            const prevWatchlist = cloudWatchlist;
            const prevWatched = cloudWatched;

            // Update state immediately
            setCloudWatchlist(newWatchlist);
            setCloudWatched(newWatched);

            // Sync to cloud
            syncToCloud(newWatchlist, newWatched).catch(error => {
                console.error('[MovieContext] ❌ Rollback:', error);
                setCloudWatchlist(prevWatchlist);
                setCloudWatched(prevWatched);
            });
        } else {
            setLocalWatchlist(newWatchlist);
            setLocalWatched(newWatched);
        }
    };

    // ========================================
    // REMOVE MOVIE
    // ========================================
    const removeMovie = (movieId) => {
        const newWatchlist = watchlist.filter(m => m.id !== movieId);
        const newWatched = watched.filter(m => m.id !== movieId);

        console.log('[MovieContext] 🗑️ Removing movie:', movieId);

        if (isCloud) {
            const prevWatchlist = cloudWatchlist;
            const prevWatched = cloudWatched;

            setCloudWatchlist(newWatchlist);
            setCloudWatched(newWatched);

            syncToCloud(newWatchlist, newWatched).catch(error => {
                console.error('[MovieContext] ❌ Rollback:', error);
                setCloudWatchlist(prevWatchlist);
                setCloudWatched(prevWatched);
            });
        } else {
            setLocalWatchlist(newWatchlist);
            setLocalWatched(newWatched);
        }
    };

    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    const moveFromWatchlistToWatched = (movieId, rating = 0) => {
        const movie = watchlist.find(m => m.id === movieId);
        if (movie) {
            addToWatched(movie, rating);
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
