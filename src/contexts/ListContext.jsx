import React, { createContext, useContext, useEffect, useState } from 'react';
import { getMovieDetails } from '../api/tmdb';
import { db } from '../api/firebase';
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    query,
    where,
    getDocs,
    getDoc,
    serverTimestamp,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useUserProfile } from './UserProfileContext';

const ListContext = createContext();

export const useLists = () => {
    const context = useContext(ListContext);
    if (!context) throw new Error('useLists must be used within ListProvider');
    return context;
};

export const ListProvider = ({ children }) => {
    const { user } = useAuth();
    const { trackBehavior } = useUserProfile();

    const [myLists, setMyLists] = useState([]);
    const [collabLists, setCollabLists] = useState([]); // Listas donde soy colaborador
    const [loading, setLoading] = useState(false);

    // 1. Fetch User Lists (Owned & Collaborative)
    useEffect(() => {
        if (!user) {
            setMyLists([]);
            setCollabLists([]);
            return;
        }

        const fetchAllLists = async () => {
            setLoading(true);

            // 1. Fetch Owned Lists
            try {
                const qOwned = query(collection(db, 'lists'), where('ownerId', '==', user.uid));
                const ownedSnap = await getDocs(qOwned);
                let ownedData = ownedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // ---------------------------------------------------------
                // AUTO-CREATE "GENERAL" LIST IF MISSING
                // ---------------------------------------------------------
                // Check if "General" list exists
                let general = ownedData.find(l => l.name === 'General');

                if (!general) {
                    console.log("No 'General' list found. Creating one...");
                    const newList = {
                        ownerId: user.uid,
                        ownerName: user.displayName || 'Anónimo',
                        name: 'General',
                        description: 'Lista principal de películas por ver',
                        privacy: 'private',
                        collaborators: [],
                        movies: [],
                        movieCount: 0,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        likes: 0,
                        coverImage: null,
                        isDefault: true
                    };
                    const docRef = await addDoc(collection(db, 'lists'), newList);
                    // Add ID to object
                    general = { id: docRef.id, ...newList };
                    ownedData.push(general);
                }

                // ---------------------------------------------------------
                // MIGRATION: RESTORE & ENRICH LEGACY WATCHLIST
                // ---------------------------------------------------------
                // Check if we need migration OR repair (if data is incomplete)
                const isGeneralEmpty = !general.movies || general.movies.length === 0;
                // Heuristic: If movies exist but specific critical fields are missing (like release_date or genre_ids), it's a "bad" migration we need to fix.
                const needsRepair = general.movies?.some(m => !m.release_date && !m.genre_ids && m.title);

                if (general && (isGeneralEmpty || needsRepair)) {
                    try {
                        const userRef = doc(db, 'users', user.uid);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            const legacyData = userSnap.data();
                            const legacyWatchlist = legacyData.watchlist || [];

                            if (legacyWatchlist.length > 0) {
                                console.log(`Migrating/Repairing ${legacyWatchlist.length} movies in General list...`);

                                const moviesToMigrate = legacyWatchlist.map(m => ({
                                    ...m, // ✨ VITAL: Keep ALL original metadata (genres, runtime, etc.)
                                    addedAt: m.addedAt || new Date().toISOString(),
                                    addedBy: user.uid
                                }));

                                // Update Firestore
                                const listRef = doc(db, 'lists', general.id);
                                await updateDoc(listRef, {
                                    movies: moviesToMigrate,
                                    movieCount: moviesToMigrate.length,
                                    coverImage: moviesToMigrate[0]?.poster_path || null
                                });

                                // Update General Object in Memory immediately
                                general.movies = moviesToMigrate;
                                general.movieCount = moviesToMigrate.length;
                                general.coverImage = moviesToMigrate[0]?.poster_path || null;

                                // Force update of state to reflect changes in UI
                                // We don't need explicit setMyLists here because ownedData (which contains general) is set via setMyLists(ownedData) at the end of this block.
                            }
                        }
                    } catch (e) {
                        console.error("Migration/Repair failed", e);
                    }
                }

                // ---------------------------------------------------------
                // REPAIR & DEDUPLICATE ALL LISTS (Fix missing metadata)
                // ---------------------------------------------------------
                for (let list of ownedData) {
                    if (!list.movies || list.movies.length === 0) continue;

                    // 1. Deduplicate by ID
                    const uniqueMoviesMap = new Map();
                    list.movies.forEach(m => {
                        if (!uniqueMoviesMap.has(m.id)) {
                            uniqueMoviesMap.set(m.id, m);
                        }
                    });
                    let cleanedMovies = Array.from(uniqueMoviesMap.values());

                    // 2. Check for broken data (missing release_date or vote_average)
                    const brokenMovies = cleanedMovies.filter(m => (!m.release_date || m.vote_average === undefined) && m.id);

                    if (brokenMovies.length > 0 || cleanedMovies.length !== list.movies.length) {
                        console.log(`🛠️ Repairing/Deduplicating list: ${list.name}`);

                        if (brokenMovies.length > 0) {
                            const repairs = await Promise.all(brokenMovies.map(async (broken) => {
                                try {
                                    const details = await getMovieDetails(broken.id);
                                    if (!details) return broken;
                                    return {
                                        ...broken,
                                        title: details.title || broken.title,
                                        poster_path: details.poster_path || broken.poster_path,
                                        backdrop_path: details.backdrop_path || broken.backdrop_path || null,
                                        release_date: details.release_date || null,
                                        vote_average: details.vote_average || 0,
                                        genre_ids: details.genres?.map(g => g.id) || broken.genre_ids || [],
                                        overview: details.overview || null
                                    };
                                } catch (e) {
                                    return broken;
                                }
                            }));

                            cleanedMovies = cleanedMovies.map(m => {
                                const repaired = repairs.find(r => r.id === m.id);
                                return repaired || m;
                            });
                        }

                        // Save updates
                        try {
                            const listRef = doc(db, 'lists', list.id);
                            await updateDoc(listRef, {
                                movies: cleanedMovies,
                                movieCount: cleanedMovies.length,
                                updatedAt: serverTimestamp()
                            });
                            // Update local reference
                            list.movies = cleanedMovies;
                            list.movieCount = cleanedMovies.length;
                        } catch (e) { console.error("Repair failed", e); }
                    }
                }

                // Sort: General always first, then by date desc
                ownedData.sort((a, b) => {
                    if (a.name === 'General') return -1;
                    if (b.name === 'General') return 1;
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                });

                setMyLists(ownedData);

            } catch (error) {
                console.error("Error fetching my lists:", error);
            }

            // 2. Fetch Collaborating Lists
            try {
                const qCollab = query(collection(db, 'lists'), where('collaborators', 'array-contains', user.uid));
                const collabSnap = await getDocs(qCollab);
                const collabData = collabSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCollabLists(collabData);
            } catch (error) {
                console.warn("⚠️ Could not fetch collaborative lists (Check Permissions). Ignoring.");
                setCollabLists([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAllLists();
    }, [user]);

    // Helpers for General List
    const generalList = myLists.find(l => l.name === 'General');

    const addToGeneralList = async (movie) => {
        if (!generalList) return;
        // Check if already in
        if (generalList.movies?.some(m => m.id === movie.id)) return;
        await addMovieToList(generalList.id, movie);
    };

    const removeFromGeneralList = async (movieId) => {
        if (!generalList) return;
        await removeMovieFromList(generalList.id, movieId);
    };

    const isInGeneralList = (movieId) => {
        return generalList?.movies?.some(m => m.id === movieId) || false;
    };

    // 2. Create List - Handles both (obj) and (name, desc, privacy) signatures
    const createList = async (arg1, arg2, arg3) => {
        if (!user) return;

        let name, description, privacy;

        // Handle object signature
        if (typeof arg1 === 'object' && arg1 !== null) {
            ({ name, description, privacy = 'public' } = arg1);
        } else {
            // Handle legacy signature
            name = arg1;
            description = arg2;
            privacy = arg3 || 'public';
        }

        try {
            const newList = {
                ownerId: user.uid,
                ownerName: user.displayName || 'Anónimo',
                name,
                description: description || '',
                privacy,
                collaborators: [], // UIDs de colaboradores
                movies: [],
                movieCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                likes: 0,
                coverImage: null
            };

            const docRef = await addDoc(collection(db, 'lists'), newList);

            // Optimistic Update
            const createdList = { id: docRef.id, ...newList, createdAt: new Date() };
            // Ensure we don't have duplicates just in case
            setMyLists(prev => [createdList, ...prev]);

            trackBehavior('listsCreated');

            return docRef.id;
        } catch (error) {
            console.error("Error creating list:", error);
            throw error;
        }
    };

    // 3. Delete List
    const deleteList = async (listId) => {
        try {
            await deleteDoc(doc(db, 'lists', listId));
            setMyLists(prev => prev.filter(l => l.id !== listId));
        } catch (error) {
            console.error("Error deleting list:", error);
            throw error;
        }
    };

    // 4. Add Movie to List
    const addMovieToList = async (listId, movie) => {
        try {
            // Check for duplicates in local state to avoid adding same movie with diff timestamp
            const currentList = [...myLists, ...collabLists].find(l => l.id === listId);
            if (currentList && currentList.movies?.some(m => m.id === movie.id)) {
                console.log("Movie already in list, skipping.");
                return;
            }

            const listRef = doc(db, 'lists', listId);

            // Ensure genres are saved as IDs
            let genre_ids = movie.genre_ids || [];
            if ((!genre_ids || genre_ids.length === 0) && movie.genres) {
                genre_ids = movie.genres.map(g => g.id);
            }

            const moviePreview = {
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path || null,
                backdrop_path: movie.backdrop_path || null,
                release_date: movie.release_date || null,
                vote_average: movie.vote_average || 0,
                genre_ids: genre_ids,
                addedAt: new Date().toISOString(),
                addedBy: user.uid // Track who added it
            };

            await updateDoc(listRef, {
                movies: arrayUnion(moviePreview),
                updatedAt: serverTimestamp()
            });

            // Update local state (check both owned and collab lists)
            const updateState = (prevLists) => prevLists.map(list => {
                if (list.id === listId) {
                    if (list.movies?.some(m => m.id === movie.id)) return list;
                    return {
                        ...list,
                        movies: [...(list.movies || []), moviePreview],
                        movieCount: (list.movieCount || 0) + 1
                    };
                }
                return list;
            });

            setMyLists(prev => updateState(prev));
            setCollabLists(prev => updateState(prev));

        } catch (error) {
            console.error("Error adding movie to list:", error);
            throw error;
        }
    };

    // 5. Remove Movie from List
    const removeMovieFromList = async (listId, movieId) => {
        try {
            const listRef = doc(db, 'lists', listId);

            // Find list in either collection
            const allLists = [...myLists, ...collabLists];
            const listFn = allLists.find(l => l.id === listId);
            if (!listFn) return;

            const movieToRemove = listFn.movies.find(m => m.id === movieId);
            if (!movieToRemove) return;

            await updateDoc(listRef, {
                movies: arrayRemove(movieToRemove),
                updatedAt: serverTimestamp()
            });

            // Update local state
            const updateState = (prevLists) => prevLists.map(list => {
                if (list.id === listId) {
                    return {
                        ...list,
                        movies: list.movies.filter(m => m.id !== movieId),
                        movieCount: Math.max(0, (list.movieCount || 0) - 1)
                    };
                }
                return list;
            });

            setMyLists(prev => updateState(prev));
            setCollabLists(prev => updateState(prev));

        } catch (error) {
            console.error("Error removing movie from list:", error);
            throw error;
        }
    };

    // 6. Get Single List
    const getListById = async (listId) => {
        const local = [...myLists, ...collabLists].find(l => l.id === listId);
        if (local) return local;

        try {
            const docRef = doc(db, 'lists', listId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() };
            }
            return null;
        } catch (error) {
            console.error("Error fetching list:", error);
            return null;
        }
    };

    // 7. Manage Collaborators
    const addCollaborator = async (listId, friendUid) => {
        if (!user) return;

        // Validation: Verify if 'friendUid' is actually a friend/follower
        // We can do a quick check here or rely on the UI not showing non-friends.
        // For robustness, let's assume the UI handles the filtering, but we could add a check.

        try {
            const listRef = doc(db, 'lists', listId);

            // Check if user is already a collaborator
            const list = myLists.find(l => l.id === listId);
            if (list && list.collaborators.includes(friendUid)) {
                return; // Already added
            }

            await updateDoc(listRef, {
                collaborators: arrayUnion(friendUid)
            });

            setMyLists(prev => prev.map(l => {
                if (l.id === listId) {
                    return { ...l, collaborators: [...(l.collaborators || []), friendUid] };
                }
                return l;
            }));

        } catch (e) {
            console.error("Error adding collaborator", e);
            throw e;
        }
    };

    const removeCollaborator = async (listId, collaboratorUid) => {
        try {
            const listRef = doc(db, 'lists', listId);
            await updateDoc(listRef, {
                collaborators: arrayRemove(collaboratorUid)
            });

            setMyLists(prev => prev.map(l => {
                if (l.id === listId) {
                    return {
                        ...l,
                        collaborators: (l.collaborators || []).filter(uid => uid !== collaboratorUid)
                    };
                }
                return l;
            }));
        } catch (e) {
            console.error("Error removing collaborator", e);
            throw e;
        }
    };

    const leaveList = async (listId) => {
        if (!user) return;
        try {
            const listRef = doc(db, 'lists', listId);
            await updateDoc(listRef, {
                collaborators: arrayRemove(user.uid)
            });
            // Update local state: remove from collabLists
            setCollabLists(prev => prev.filter(l => l.id !== listId));
        } catch (e) {
            console.error("Error leaving list", e);
            throw e;
        }
    };

    const setMovieWatchedInList = async (listId, movieId, watchedStatus = true) => {
        try {
            const listRef = doc(db, 'lists', listId);
            const list = [...myLists, ...collabLists].find(l => l.id === listId);
            if (!list) return;

            const updatedMovies = list.movies.map(m => {
                if (m.id === movieId) {
                    return { ...m, watched: watchedStatus, watchedAt: new Date().toISOString() };
                }
                return m;
            });

            await updateDoc(listRef, {
                movies: updatedMovies,
                updatedAt: serverTimestamp()
            });

            // Update local state
            const updateState = (prevLists) => prevLists.map(l => {
                if (l.id === listId) {
                    return { ...l, movies: updatedMovies };
                }
                return l;
            });

            setMyLists(prev => updateState(prev));
            setCollabLists(prev => updateState(prev));
        } catch (error) {
            console.error("Error marking movie as watched in list:", error);
            throw error;
        }
    };

    const moveMovieBetweenLists = async (sourceListId, targetListId, movie) => {
        try {
            // 1. Add to target list
            await addMovieToList(targetListId, movie);
            // 2. Remove from source list
            await removeMovieFromList(sourceListId, movie.id);
        } catch (error) {
            console.error("Error moving movie:", error);
            throw error;
        }
    };

    const value = {
        myLists,
        collabLists, // Expose collaborative lists
        allLists: [...myLists, ...collabLists], // Helper
        loading,
        createList,
        deleteList,
        addMovieToList,
        removeMovieFromList,
        moveMovieBetweenLists,
        setMovieWatchedInList,
        getListById,
        addCollaborator,
        removeCollaborator,
        leaveList,
        generalList,
        addToGeneralList,
        removeFromGeneralList,
        isInGeneralList
    };

    return (
        <ListContext.Provider value={value}>
            {children}
        </ListContext.Provider>
    );
};
