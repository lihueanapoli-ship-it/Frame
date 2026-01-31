import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../api/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error logging in with Google", error);
            alert("Error al iniciar sesión. Verifica tu configuración de Firebase.");
        }
    };

    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{ user, loginWithGoogle, logout, loading }}>
            {/* Show nothing while checking auth status to prevent flicker */}
            {!loading && children}
        </AuthContext.Provider>
    );
};
