import { useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Tracks whether the current user is online and syncs their status to Firestore.
 * - Sets isOnline: true when the page becomes visible
 * - Sets isOnline: false when the page is hidden (tab switch, minimize, close)
 * - Uses `visibilitychange` + `beforeunload` events for maximum coverage
 */
const usePresence = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);

        const setOnline = () => {
            updateDoc(userRef, {
                isOnline: true,
                lastSeen: serverTimestamp(),
            }).catch(() => { });
        };

        const setOffline = () => {
            updateDoc(userRef, {
                isOnline: false,
                lastSeen: serverTimestamp(),
            }).catch(() => { });
        };

        // Go online immediately
        setOnline();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setOnline();
            } else {
                setOffline();
            }
        };

        // Best-effort on tab close / navigation away
        const handleBeforeUnload = () => setOffline();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            setOffline();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [user?.uid]);
};

export default usePresence;
