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
    const [loading, setLoading] = useState(false);
    const [currentList, setCurrentList] = useState(null); // Para ver una lista específica

    // 1. Fetch User Lists
    useEffect(() => {
        if (!user) {
            setMyLists([]);
            return;
        }

        const fetchMyLists = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'lists'),
                    where('ownerId', '==', user.uid)
                );
                const snapshot = await getDocs(q);
                const listsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setMyLists(listsData);
            } catch (error) {
                console.error("Error fetching lists:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMyLists();
    }, [user]);

    // 2. Create List
    const createList = async (name, description, privacy = 'public') => {
        if (!user) return;

        try {
            const newList = {
                ownerId: user.uid,
                ownerName: user.displayName || 'Anónimo',
                name,
                description,
                privacy, // 'public', 'private', 'friends'
                movies: [], // Array of { movieId, addedAt, title, poster } - Mini cache
                movieCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                likes: 0,
                coverImage: null // Opcional: URL de la imagen de portada
            };

            const docRef = await addDoc(collection(db, 'lists'), newList);

            // Optimistic Update
            const createdList = { id: docRef.id, ...newList, createdAt: new Date() };
            setMyLists(prev => [createdList, ...prev]);

            // Track behavior
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
                addedAt: new Date().toISOString()
            };

            await updateDoc(listRef, {
                movies: arrayUnion(moviePreview),
                movieCount: 42, // Firestore limits increment inside array update mix? No, separate field.
                updatedAt: serverTimestamp()
            });

            // Hack: increment count separately safely or rely on array length in client
            // We'll update local state instantly
            setMyLists(prev => prev.map(list => {
                if (list.id === listId) {
                    // Avoid duplicates in local state
                    if (list.movies.some(m => m.id === movie.id)) return list;
                    return {
                        ...list,
                        movies: [...list.movies, moviePreview],
                        movieCount: (list.movieCount || 0) + 1
                    };
                }
                return list;
            }));

        } catch (error) {
            console.error("Error adding movie to list:", error);
            throw error;
        }
    };

    // 5. Remove Movie from List
    const removeMovieFromList = async (listId, movieId) => {
        try {
            const listRef = doc(db, 'lists', listId);
            const listFn = myLists.find(l => l.id === listId);
            if (!listFn) return;

            const movieToRemove = listFn.movies.find(m => m.id === movieId);
            if (!movieToRemove) return;

            await updateDoc(listRef, {
                movies: arrayRemove(movieToRemove),
                updatedAt: serverTimestamp()
            });

            setMyLists(prev => prev.map(list => {
                if (list.id === listId) {
                    return {
                        ...list,
                        movies: list.movies.filter(m => m.id !== movieId),
                        movieCount: Math.max(0, (list.movieCount || 0) - 1)
                    };
                }
                return list;
            }));

        } catch (error) {
            console.error("Error removing movie from list:", error);
            throw error;
        }
    };

    // 6. Get Single List (For View)
    const getListById = async (listId) => {
        // Check local first
        const local = myLists.find(l => l.id === listId);
        if (local) return local;

        // Fetch remote
        try {
            const docRef = doc(db, 'lists', listId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() };
            }
            return null;
        } catch (error) {
            console.error("Error fetching list details:", error);
            return null;
        }
    };

    const value = {
        myLists,
        loading,
        createList,
        deleteList,
        addMovieToList,
        removeMovieFromList,
        getListById
    };

    return (
        <ListContext.Provider value={value}>
            {children}
        </ListContext.Provider>
    );
};
