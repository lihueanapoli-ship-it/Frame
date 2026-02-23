import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useAuth } from './AuthContext';
import { db } from '../api/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

import { useLists } from './ListContext';

const MovieContext = createContext();

export const useMovies = () => useContext(MovieContext);

export const MovieProvider = ({ children }) => {
    // Local Storage (Fallback)
    const [localWatchlist, setLocalWatchlist] = useLocalStorage('cinetrack_watchlist', []);
    const [localWatched, setLocalWatched] = useLocalStorage('cinetrack_watched', []);

    // Cloud State
    const [cloudWatchlist, setCloudWatchlist] = useState([]);
    const [cloudWatched, setCloudWatched] = useState([]);

    // Lists for Group-Watched sync
    const { allLists } = useLists();

    // Sync state - prevents race conditions
    const isSyncingRef = useRef(false);
    const syncTimeoutRef = useRef(null);

    const { user } = useAuth();
    const isCloud = !!user && !!db;

    // Internal Arrays
    const rawWatchlist = isCloud ? cloudWatchlist : localWatchlist;
    const rawWatched = isCloud ? cloudWatched : localWatched;

    // Computed State: Merge personal watched with movies marked as watched in shared lists
    const watched = useMemo(() => {
        const personal = rawWatched;
        const groupWatched = [];

        // Harvest movies from lists that are marked as watched: true
        (allLists || []).forEach(list => {
            (list.movies || []).forEach(movie => {
                if (movie.watched) {
                    groupWatched.push(movie);
                }
            });
        });

        if (groupWatched.length === 0) return personal;

        // Merge and Deduplicate by ID
        const combined = [...personal];
        const seenIds = new Set(personal.map(m => m.id));

        groupWatched.forEach(movie => {
            if (!seenIds.has(movie.id)) {
                combined.push(movie);
                seenIds.add(movie.id);
            }
        });

        return combined;
    }, [rawWatched, allLists]);

    // Watchlist Truth
    const watchlist = rawWatchlist;

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
    // CLOUD SYNC FUNCTION (Debounced)
    // ========================================
    const syncToCloud = async (newWatchlist, newWatched) => {
        if (!user || !db) {
            console.log('[MovieContext] ⚠️ Cannot sync: no user/db');
            return;
        }

        // Clear any existing sync timeout
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        // Debounce: Wait 500ms before syncing (batch multiple changes)
        syncTimeoutRef.current = setTimeout(async () => {
            // Set syncing flag
            isSyncingRef.current = true;

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
                // Release sync flag after 1 second to ensure Firebase propagation
                setTimeout(() => {
                    isSyncingRef.current = false;
                    console.log('[MovieContext] 🔓 Sync flag released');
                }, 1000);
            }
        }, 500); // Debounce 500ms
    };

    // ========================================
    // HELPER: Strip unnecessary data
    // Firebase has 1MB limit per document
    // We only need: id, title, poster_path, rating, dates, runtime, genres
    // ========================================
    const stripMovieData = (movie) => {
        // Normalize genres to IDs
        let genre_ids = movie.genre_ids || [];
        if ((!genre_ids || genre_ids.length === 0) && movie.genres) {
            genre_ids = movie.genres.map(g => g.id);
        }

        return {
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path || null,
            release_date: movie.release_date || null,
            vote_average: movie.vote_average || 0,
            runtime: movie.runtime || 0,
            genre_ids: genre_ids,
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
    // UPDATE METADATA (Repairs missing fields)
    // ========================================
    const updateMovieMetadata = (movieId, newData) => {
        let updated = false;

        // Helper to update list if item exists
        const updateList = (list) => {
            return list.map(m => {
                if (m.id === movieId) {
                    updated = true;
                    // Merge existing data with new data, ensuring we don't overwrite user data with partials if not intended
                    return { ...m, ...newData };
                }
                return m;
            });
        };

        const newWatchlist = updateList(watchlist);
        const newWatched = updateList(watched);

        if (updated) {
            console.log(`[MovieContext] 🛠️ Repaired metadata for movie ${movieId}`);
            if (isCloud) {
                setCloudWatchlist(newWatchlist);
                setCloudWatched(newWatched);
                syncToCloud(newWatchlist, newWatched).catch(err => console.error(err));
            } else {
                setLocalWatchlist(newWatchlist);
                setLocalWatched(newWatched);
            }
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
            updateMovieMetadata,
            isWatched,
            isInWatchlist
        }}>
            {children}
        </MovieContext.Provider>
    );
};
