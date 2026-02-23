import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
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
    onSnapshot,
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

    const hasInitializedRef = useRef(false);
    const prevWatchedRef = useRef({}); // { listId: Set of watched movie IDs }

    // 1. Listen to My Lists (Owned)
    useEffect(() => {
        if (!user) {
            setMyLists([]);
            return;
        }

        const qOwned = query(collection(db, 'lists'), where('ownerId', '==', user.uid));

        const unsubscribe = onSnapshot(qOwned, async (snapshot) => {
            let ownedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // --- ONE-TIME INITIALIZATION & REPAIR ---
            if (!hasInitializedRef.current) {
                setLoading(true);
                let general = ownedData.find(l => l.name === 'General');

                // Auto-create general if missing
                if (!general) {
                    const newList = {
                        ownerId: user.uid,
                        ownerName: user.displayName || 'Anónimo',
                        name: 'General',
                        description: 'Lista principal de películas por ver',
                        privacy: 'public',
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
                    general = { id: docRef.id, ...newList };
                    ownedData.push(general);
                }

                // Repair/Migration Logic
                try {
                    const isGeneralEmpty = !general.movies || general.movies.length === 0;
                    if (isGeneralEmpty) {
                        const userRef = doc(db, 'users', user.uid);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            const legacyWatchlist = userSnap.data().watchlist || [];
                            if (legacyWatchlist.length > 0) {
                                const moviesToMigrate = legacyWatchlist.map(m => ({
                                    ...m,
                                    addedAt: m.addedAt || new Date().toISOString(),
                                    addedBy: user.uid
                                }));
                                await updateDoc(doc(db, 'lists', general.id), {
                                    movies: moviesToMigrate,
                                    movieCount: moviesToMigrate.length,
                                    coverImage: moviesToMigrate[0]?.poster_path || null
                                });
                                general.movies = moviesToMigrate;
                            }
                        }
                    }

                    // Deep Repair missing metadata
                    for (let list of ownedData) {
                        if (!list.movies?.length) continue;
                        const broken = list.movies.filter(m => !m.release_date || m.vote_average === undefined);
                        if (broken.length > 0) {
                            const repairs = await Promise.all(broken.map(async (b) => {
                                const d = await getMovieDetails(b.id);
                                return d ? { ...b, release_date: d.release_date, vote_average: d.vote_average, genre_ids: d.genres?.map(g => g.id) } : b;
                            }));
                            const cleaned = list.movies.map(m => repairs.find(r => r.id === m.id) || m);
                            await updateDoc(doc(db, 'lists', list.id), { movies: cleaned, movieCount: cleaned.length });
                        }
                    }
                } catch (e) { console.error("Repair error", e); }

                hasInitializedRef.current = true;
                setLoading(false);
            }

            ownedData.sort((a, b) => {
                if (a.name === 'General') return -1;
                if (b.name === 'General') return 1;
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            });

            setMyLists(ownedData);
        }, (error) => {
            console.error("Owned lists error:", error);
        });

        return () => unsubscribe();
    }, [user]);

    // 2. Listen to Collaborative Lists & Notifications
    useEffect(() => {
        if (!user) {
            setCollabLists([]);
            return;
        }

        const qCollab = query(collection(db, 'lists'), where('collaborators', 'array-contains', user.uid));

        const unsubscribe = onSnapshot(qCollab, (snapshot) => {
            const collabData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            collabData.forEach(list => {
                const currentWatchedIds = new Set((list.movies || []).filter(m => m.watched).map(m => m.id));
                const prevIds = prevWatchedRef.current[list.id];

                if (prevIds) {
                    const newId = Array.from(currentWatchedIds).find(id => !prevIds.has(id));
                    if (newId) {
                        const movie = list.movies.find(m => m.id === newId);
                        if (movie && movie.watchedBy !== user.uid) {
                            toast.success(`${movie.watchedByName || 'Alguien'} vio "${movie.title}"`, {
                                description: `¡Actualizado en ${list.name}!`,
                                icon: '🎬',
                                duration: 5000
                            });
                        }
                    }
                }
                prevWatchedRef.current[list.id] = currentWatchedIds;
            });

            setCollabLists(collabData);
        }, (error) => {
            console.warn("Collab error:", error);
            setCollabLists([]);
        });

        return () => unsubscribe();
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
                    return {
                        ...m,
                        watched: watchedStatus,
                        watchedAt: new Date().toISOString(),
                        watchedBy: user.uid,
                        watchedByName: user.displayName || 'Alguien'
                    };
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

    const updateList = async (listId, updates) => {
        try {
            const listRef = doc(db, 'lists', listId);
            await updateDoc(listRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating list:", error);
            throw error;
        }
    };

    const value = {
        myLists,
        collabLists,
        allLists: [...myLists, ...collabLists],
        loading,
        createList,
        deleteList,
        updateList,
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
