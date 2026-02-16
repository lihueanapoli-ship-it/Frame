import React, { createContext, useContext, useEffect, useState } from 'react';
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
                    // OPTIONAL: Migrate legacy watchlist here if we read user profile
                    // For now, just create empty General list
                    const newList = {
                        ownerId: user.uid,
                        ownerName: user.displayName || 'Anónimo',
                        name: 'General',
                        description: 'Lista principal de películas por ver',
                        privacy: 'private', // Default to private or public? User said "Functionalities same".
                        collaborators: [],
                        movies: [], // Start empty. Data migration is complex without reading user doc.
                        movieCount: 0,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        likes: 0,
                        coverImage: null,
                        isDefault: true // Marker
                    };
                    const docRef = await addDoc(collection(db, 'lists'), newList);
                    const createdList = { id: docRef.id, ...newList };
                    ownedData.push(createdList);
                    general = createdList;
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
            const listRef = doc(db, 'lists', listId);
            const moviePreview = {
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
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

    const moveMovieBetweenLists = async (sourceListId, targetListId, movie) => {
        try {
            // 1. Add to target list
            await addMovieToList(targetListId, movie);

            // 2. Remove from source list (if not watchlist/watched handled differently elsewhere, but here assumes Custom List ID)
            // Note: If sourceListId is 'watchlist', this function might need adaptation if used from general view, 
            // but for custom-to-custom move, this is correct.
            // If the intention is to move from a Custom List to another Custom List:
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
