import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../api/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            setAuthLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                const syncUser = async () => {
                    try {
                        const userRef = doc(db, 'users', currentUser.uid);
                        await setDoc(userRef, {
                            uid: currentUser.uid,
                            displayName: currentUser.displayName,
                            email: currentUser.email,
                            photoURL: currentUser.photoURL,
                            searchName: currentUser.displayName
                                ? currentUser.displayName.toLowerCase()
                                : '',
                            lastLogin: serverTimestamp(),
                        }, { merge: true });
                    } catch (error) {
                        console.error('Error syncing user to Firestore:', error);
                    }
                };

                if ('requestIdleCallback' in window) {
                    requestIdleCallback(syncUser, { timeout: 5000 });
                } else {
                    setTimeout(syncUser, 0);
                }
            }

            setAuthLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        if (!auth) {
            alert('No se puede iniciar sesión: Falta configuración de Firebase en .env');
            return;
        }
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Error logging in with Google', error);
            alert('Error al iniciar sesión. Verifica tu configuración de Firebase.');
        }
    };

    const logout = () => {
        if (auth) signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loginWithGoogle, logout, loading: authLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
