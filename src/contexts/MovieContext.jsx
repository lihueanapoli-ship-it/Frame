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

    // Track if we're in the middle of a write operation
    const pendingWriteRef = useRef(false);
    const lastWriteDataRef = useRef(null);

    const { user } = useAuth();
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

        console.log('[MovieContext] 🔥 Setting up Firebase listener for user:', user.uid);
        const userRef = doc(db, 'users', user.uid);

        // Real-time listener
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                console.log('[MovieContext] 📥 Firebase event received:', {
                    watchlist: data.watchlist?.length || 0,
                    watched: data.watched?.length || 0,
                    pendingWrite: pendingWriteRef.current
                });

                // ⚠️ CRITICAL: Don't overwrite if we're in the middle of a write
                if (pendingWriteRef.current) {
                    console.log('[MovieContext] ⏸️ Ignoring Firebase event (write in progress)');
                    return;
                }

                // Update state only if data actually changed
                const dataChanged =
                    JSON.stringify(data.watchlist) !== JSON.stringify(cloudWatchlist) ||
                    JSON.stringify(data.watched) !== JSON.stringify(cloudWatched);

                if (dataChanged) {
                    console.log('[MovieContext] ✅ Applying Firebase data');
                    setCloudWatchlist(data.watchlist || []);
                    setCloudWatched(data.watched || []);
                } else {
                    console.log('[MovieContext] ⏭️ No changes detected, skipping update');
                }
            } else {
                console.log('[MovieContext] 📝 Document does not exist, creating');
                // Create user doc if not exists
                const initialData = {
                    watchlist: localWatchlist.length > 0 ? localWatchlist : [],
                    watched: localWatched.length > 0 ? localWatched : [],
                    createdAt: new Date().toISOString()
                };

                pendingWriteRef.current = true;
                setDoc(userRef, initialData, { merge: true })
                    .then(() => {
                        console.log('[MovieContext] ✅ Initial document created');
                    })
                    .catch((error) => {
                        console.error('[MovieContext] ❌ Failed to create document:', error);
                    })
                    .finally(() => {
                        // Wait a bit before allowing listener updates
                        setTimeout(() => {
                            pendingWriteRef.current = false;
                        }, 1000);
                    });
            }
        }, (error) => {
            console.error('[MovieContext] ❌ Firebase listener error:', error);
        });

        return () => {
            console.log('[MovieContext] 🧹 Cleaning up Firebase listener');
            unsubscribe();
        };
    }, [user, db]);

    // Helper to update Cloud with locking mechanism
    const updateCloud = async (newWatchlist, newWatched) => {
        if (!user || !db) {
            console.log('[MovieContext] ⚠️ Cannot update cloud: no user or db');
            return;
        }

        const userRef = doc(db, 'users', user.uid);

        // Set pending write flag to prevent listener overwrites
        pendingWriteRef.current = true;
        lastWriteDataRef.current = { watchlist: newWatchlist, watched: newWatched };

        try {
            console.log('[MovieContext] 💾 Writing to Firebase:', {
                watchlist: newWatchlist.length,
                watched: newWatched.length
            });

            await setDoc(userRef, {
                watchlist: newWatchlist,
                watched: newWatched,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            console.log('[MovieContext] ✅ Successfully synced to Firebase');
        } catch (error) {
            console.error('[MovieContext] ❌ Error syncing to cloud:', error);
            throw error;
        } finally {
            // Clear pending flag after a delay to ensure listener has time to process
            setTimeout(() => {
                pendingWriteRef.current = false;
                lastWriteDataRef.current = null;
                console.log('[MovieContext] 🔓 Write lock released');
            }, 1500); // 1.5 seconds should be enough for Firebase to propagate
        }
    };

    const addToWatchlist = (movie) => {
        const movieToAdd = { ...movie, addedAt: new Date().toISOString() };

        // Avoid duplicates
        if (watchlist.some(m => m.id === movie.id) || watched.some(m => m.id === movie.id)) {
            console.log('[MovieContext] ⚠️ Movie already in watchlist or watched');
            return;
        }

        const newWatchlist = [...watchlist, movieToAdd];
        console.log('[MovieContext] ➕ Adding to watchlist:', movie.title);

        if (isCloud) {
            // Optimistic UI: Update state immediately
            setCloudWatchlist(newWatchlist);

            // Then sync to cloud
            updateCloud(newWatchlist, watched).catch(error => {
                console.error('[MovieContext] Failed to sync watchlist:', error);
                // Rollback on error
                setCloudWatchlist(watchlist);
            });
        } else {
            setLocalWatchlist(newWatchlist);
        }
    };

    const addToWatched = (movie, rating = 0) => {
        const newWatchlist = watchlist.filter(m => m.id !== movie.id);

        // Add/Update watched
        let newWatched;
        const existingIndex = watched.findIndex(m => m.id === movie.id);

        if (existingIndex >= 0) {
            const updatedItem = { ...watched[existingIndex], rating };
            newWatched = [...watched];
            newWatched[existingIndex] = updatedItem;
            console.log('[MovieContext] 🔄 Updating rating:', movie.title, rating);
        } else {
            const movieToAdd = { ...movie, rating, watchedAt: new Date().toISOString() };
            newWatched = [...watched, movieToAdd];
            console.log('[MovieContext] ✅ Marking as watched:', movie.title);
        }

        if (isCloud) {
            const prevWatchlist = cloudWatchlist;
            const prevWatched = cloudWatched;

            setCloudWatchlist(newWatchlist);
            setCloudWatched(newWatched);

            updateCloud(newWatchlist, newWatched).catch(error => {
                console.error('[MovieContext] Failed to sync watched:', error);
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

        console.log('[MovieContext] 🗑️ Removing movie:', movieId);

        if (isCloud) {
            const prevWatchlist = cloudWatchlist;
            const prevWatched = cloudWatched;

            setCloudWatchlist(newWatchlist);
            setCloudWatched(newWatched);

            updateCloud(newWatchlist, newWatched).catch(error => {
                console.error('[MovieContext] Failed to remove movie:', error);
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
