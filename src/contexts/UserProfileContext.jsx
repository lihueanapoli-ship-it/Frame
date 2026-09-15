import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../api/firebase';
import {
    doc, getDoc, setDoc, updateDoc, writeBatch, runTransaction,
    collection, query, where, getDocs, limit, arrayRemove, serverTimestamp
} from 'firebase/firestore';
import { getMissingProfileFields } from '../utils/profile';

const UserProfileContext = createContext();

export const useUserProfile = () => {
    const context = useContext(UserProfileContext);
    if (!context) throw new Error('useUserProfile must be used within UserProfileProvider');
    return context;
};

export const UserProfileProvider = ({ children }) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Profile defaults and movie data share one document. A transaction preserves
    // concurrent writes from MovieContext and only fills missing profile fields.
    useEffect(() => {
        let cancelled = false;
        setProfile(null);
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const fetchProfile = async () => {
            try {
                const docRef = doc(db, 'users', user.uid);
                const data = await runTransaction(db, async transaction => {
                    const snapshot = await transaction.get(docRef);
                    const stored = snapshot.exists() ? snapshot.data() : {};
                    const missing = getMissingProfileFields(stored, user);
                    if (Object.keys(missing).length) {
                        transaction.set(docRef, missing, { merge: true });
                    }
                    const merged = { ...stored, ...missing };
                    for (const key of ['preferences', 'stats', 'gamification', 'privacySettings']) {
                        merged[key] = { ...stored[key], ...missing[key] };
                    }
                    return merged;
                });
                if (!cancelled) setProfile(data);
            } catch (error) {
                console.error('Error fetching user profile:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchProfile();
        return () => { cancelled = true; };
    }, [user]);

    // Track user behavior
    const trackBehavior = async (actionType, metadata = {}) => {
        if (!user || !profile) return;

        // ... logic for behavior tracking (Simplified for this context update)
        // In a real app, we would recalculate XP, level, etc here.
        // For now, we keep the structure.
    };

    const updateProfile = async (newData) => {
        if (!user) return;
        try {
            const docRef = doc(db, 'users', user.uid);
            const updates = { ...newData };
            if (typeof updates.displayName === 'string') {
                updates.searchName = updates.displayName.trim().toLowerCase();
            }
            await updateDoc(docRef, updates);
            setProfile(prev => ({ ...prev, ...updates }));
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    };

    // --- UTILS FASE 5 ---

    const toggleProStatus = async () => {
        if (!profile) return;
        const newStatus = !profile.isPro;
        await updateProfile({ isPro: newStatus });
        return newStatus;
    };

    const updatePrivacySettings = async (newSettings) => {
        if (!profile) return;
        const updatedPrivacy = { ...profile.privacySettings, ...newSettings };
        await updateProfile({ privacySettings: updatedPrivacy });
    };

    const checkFeatureAccess = (featureName) => {
        if (!profile) return false;
        // Mock simple logic
        if (featureName === 'unlimited_lists' && !profile.isPro) return false;
        if (featureName === '4k_streaming' && !profile.isPro) return false;
        return true;
    };

    // --- SOCIAL ACTIONS (Real Implementation) ---

    // Check if current user follows targetUserId
    const isUserFollowing = async (targetUserId) => {
        if (!user || !targetUserId) return false;
        try {
            const docRef = doc(db, 'users', user.uid, 'following', targetUserId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists();
        } catch (error) {
            console.error("Error checking follow status:", error);
            return false;
        }
    };

    const followUser = async (targetUser) => {
        if (!user || !targetUser?.uid || user.uid === targetUser.uid) return;

        try {
            const batch = writeBatch(db);

            // 1. Add to My 'following' subcollection
            const myFollowingRef = doc(db, 'users', user.uid, 'following', targetUser.uid);
            batch.set(myFollowingRef, {
                uid: targetUser.uid,
                displayName: targetUser.displayName || 'Usuario',
                photoURL: targetUser.photoURL || null,
                followedAt: new Date().toISOString()
            });

            // 2. Add Me to Their 'followers' subcollection
            const theirFollowersRef = doc(db, 'users', targetUser.uid, 'followers', user.uid);
            batch.set(theirFollowersRef, {
                uid: user.uid,
                displayName: user.displayName || 'Usuario',
                photoURL: user.photoURL || null,
                followedAt: new Date().toISOString()
            });

            // Relationship documents are the source of truth. Never mutate another
            // user's root document to maintain denormalized counters.

            await batch.commit();
            return true;
        } catch (error) {
            console.error("Error following user:", error);
            throw error;
        }
    };

    const unfollowUser = async (targetUserId) => {
        if (!user || !targetUserId || user.uid === targetUserId) return;

        try {
            const batch = writeBatch(db);

            // 1. Remove from My 'following'
            const myFollowingRef = doc(db, 'users', user.uid, 'following', targetUserId);
            batch.delete(myFollowingRef);

            // 2. Remove Me from Their 'followers'
            const theirFollowersRef = doc(db, 'users', targetUserId, 'followers', user.uid);
            batch.delete(theirFollowersRef);

            // Relationship documents are the source of truth. Never mutate another
            // user's root document to maintain denormalized counters.

            // 4. CRITICAL: Remove ME from any lists owned by THEM (lose access to shared lists)
            // Query lists owned by targetUserId where I am a collaborator
            const sharedListsQuery = query(
                collection(db, 'lists'),
                where('ownerId', '==', targetUserId),
                where('collaborators', 'array-contains', user.uid)
            );

            const sharedSnap = await getDocs(sharedListsQuery);
            sharedSnap.forEach(listDoc => {
                batch.update(listDoc.ref, {
                    collaborators: arrayRemove(user.uid)
                });
            });

            // As owner, also remove their access to my shared lists.
            const myListsSharedQuery = query(
                collection(db, 'lists'),
                where('ownerId', '==', user.uid),
                where('collaborators', 'array-contains', targetUserId)
            );
            const myListsSnap = await getDocs(myListsSharedQuery);
            myListsSnap.forEach(listDoc => {
                batch.update(listDoc.ref, {
                    collaborators: arrayRemove(targetUserId)
                });
            });

            await batch.commit();
            return true;
        } catch (error) {
            console.error("Error unfollowing user:", error);
            throw error;
        }
    };

    // --- FRIEND REQUESTS (Added for Public Profile) ---
    const sendFriendRequest = async (targetUser) => {
        if (!user || user.uid === targetUser.uid) return;
        try {
            await setDoc(doc(db, 'friendRequests', `${user.uid}_${targetUser.uid}`), {
                fromUid: user.uid,
                fromName: profile?.displayName || user.displayName || 'Usuario',
                fromPhoto: profile?.photoURL || user.photoURL || null,
                toUid: targetUser.uid,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            // Using setDoc with composite ID prevents duplicates easily
        } catch (e) {
            console.error("Error sending friend request", e);
            throw e;
        }
    };

    const getFriendshipStatus = useCallback(async (targetUid) => {
        if (!user) return 'none';
        try {
            // 1. Check if Friends
            const friendRef = doc(db, 'users', user.uid, 'friends', targetUid);
            const friendSnap = await getDoc(friendRef);
            if (friendSnap.exists()) return 'friend';

            // Queries also handle absent requests under participant-only read rules
            // and remain compatible with older requests created with random IDs.
            const [sent, received] = await Promise.all([
                getDocs(query(collection(db, 'friendRequests'),
                    where('fromUid', '==', user.uid), where('toUid', '==', targetUid), limit(1))),
                getDocs(query(collection(db, 'friendRequests'),
                    where('fromUid', '==', targetUid), where('toUid', '==', user.uid), limit(1)))
            ]);
            if (!sent.empty) return 'sent';
            if (!received.empty) return 'received';

            return 'none';
        } catch (e) {
            console.error("Error checking friendship", e);
            return 'none';
        }
    }, [user?.uid]);

    const value = {
        profile,
        loading,
        updateProfile,
        trackBehavior,
        toggleProStatus,
        updatePrivacySettings,
        checkFeatureAccess,
        followUser,
        unfollowUser,
        isUserFollowing,
        sendFriendRequest,
        getFriendshipStatus
    };

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    );
};
