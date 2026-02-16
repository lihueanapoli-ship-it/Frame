import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../api/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, writeBatch } from 'firebase/firestore';
import {
    calculateExpertiseLevel,
    getUIConfigForLevel,
    calculateCurrentStreak,
    analyzeGenrePreferences,
    analyzeDecadePreference
} from '../utils/userProfiler';

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

    // Initial load
    useEffect(() => {
        if (!user) {
            setProfile(null);
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const docRef = doc(db, 'userProfiles', user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    let data = docSnap.data();
                    let needsUpdate = false;

                    // --- AUTO-MIGRATION / REPAIR ---
                    // Fix missing Username
                    if (!data.username) {
                        const baseName = (user.displayName || user.email?.split('@')[0] || 'user').replace(/\s+/g, '').toLowerCase();
                        data.username = `${baseName}${Math.floor(Math.random() * 1000)}`;
                        needsUpdate = true;
                    }
                    // Fix missing Social Stats
                    if (!data.social) {
                        data.social = { followersCount: 0, followingCount: 0 };
                        needsUpdate = true;
                    }
                    if (!data.stats) {
                        data.stats = { moviesWatched: 0, minutesWatched: 0, averageRating: 0 };
                        needsUpdate = true;
                    }
                    // Fix missing Privacy
                    if (!data.privacySettings) {
                        data.privacySettings = { profile: 'public', lists: 'public' };
                        needsUpdate = true;
                    }
                    // Fix missing Custom Lists
                    if (!data.customLists) {
                        data.customLists = [];
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        console.log("🔧 Auto-repairing user profile with missing fields...");
                        await updateDoc(docRef, data);
                    }

                    setProfile(data);
                } else {
                    // Create new profile
                    const initialProfile = {
                        uid: user.uid,
                        displayName: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        createdAt: new Date().toISOString(),
                        stats: {
                            moviesWatched: 0,
                            minutesWatched: 0,
                            averageRating: 0,
                            favoriteGenre: null
                        },
                        gamification: {
                            level: 1,
                            xp: 0,
                            streak: 0,
                            badges: []
                        },
                        activityLog: [new Date().toISOString()],
                        onboardingCompleted: false,
                        preferences: {
                            theme: 'dark',
                            language: 'es-MX',
                            reducedMotion: false
                        },
                        // Fase 5: Social & Monetization Foundation
                        username: user.displayName ? user.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000) : `user${Math.floor(Math.random() * 10000)}`,
                        isPro: false,
                        privacySettings: {
                            profile: 'public', // public, friends, private
                            lists: 'public'
                        },
                        customLists: [],
                        social: {
                            followersCount: 0,
                            followingCount: 0
                        }
                    };
                    await setDoc(docRef, initialProfile);
                    setProfile(initialProfile);
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
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
            const docRef = doc(db, 'userProfiles', user.uid);
            await updateDoc(docRef, newData);
            setProfile(prev => ({ ...prev, ...newData }));
        } catch (error) {
            console.error("Error updating profile:", error);
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
            const docRef = doc(db, 'userProfiles', user.uid, 'following', targetUserId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists();
        } catch (error) {
            console.error("Error checking follow status:", error);
            return false;
        }
    };

    const followUser = async (targetUser) => {
        if (!user || !targetUser.uid) return;

        try {
            const batch = writeBatch(db);

            // 1. Add to My 'following' subcollection
            const myFollowingRef = doc(db, 'userProfiles', user.uid, 'following', targetUser.uid);
            batch.set(myFollowingRef, {
                uid: targetUser.uid,
                displayName: targetUser.displayName || 'Usuario',
                photoURL: targetUser.photoURL || null,
                followedAt: new Date().toISOString()
            });

            // 2. Add Me to Their 'followers' subcollection
            const theirFollowersRef = doc(db, 'userProfiles', targetUser.uid, 'followers', user.uid);
            batch.set(theirFollowersRef, {
                uid: user.uid,
                displayName: user.displayName || 'Usuario',
                photoURL: user.photoURL || null,
                followedAt: new Date().toISOString()
            });

            // 3. Update Counts
            const myProfileRef = doc(db, 'userProfiles', user.uid);
            batch.update(myProfileRef, { 'social.followingCount': increment(1) });

            const theirProfileRef = doc(db, 'userProfiles', targetUser.uid);
            batch.update(theirProfileRef, { 'social.followersCount': increment(1) });

            await batch.commit();
            return true;
        } catch (error) {
            console.error("Error following user:", error);
            throw error;
        }
    };

    const unfollowUser = async (targetUserId) => {
        if (!user || !targetUserId) return;

        try {
            const batch = writeBatch(db);

            // 1. Remove from My 'following'
            const myFollowingRef = doc(db, 'userProfiles', user.uid, 'following', targetUserId);
            batch.delete(myFollowingRef);

            // 2. Remove Me from Their 'followers'
            const theirFollowersRef = doc(db, 'userProfiles', targetUserId, 'followers', user.uid);
            batch.delete(theirFollowersRef);

            // 3. Update Counts
            const myProfileRef = doc(db, 'userProfiles', user.uid);
            batch.update(myProfileRef, { 'social.followingCount': increment(-1) });

            const theirProfileRef = doc(db, 'userProfiles', targetUserId);
            batch.update(theirProfileRef, { 'social.followersCount': increment(-1) });

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
                fromName: user.displayName,
                fromPhoto: user.photoURL,
                toUid: targetUser.uid,
                status: 'pending',
                createdAt: new Date().toISOString() // Using ISO string for consistency or serverTimestamp if imported
            });
            // Using setDoc with composite ID prevents duplicates easily
        } catch (e) {
            console.error("Error sending friend request", e);
            throw e;
        }
    };

    const getFriendshipStatus = async (targetUid) => {
        if (!user) return 'none';
        try {
            // 1. Check if Friends
            const friendRef = doc(db, 'users', user.uid, 'friends', targetUid);
            const friendSnap = await getDoc(friendRef);
            if (friendSnap.exists()) return 'friend';

            // 2. Check if I sent a request
            // Note: Since we use composite IDs now, we can check directly if we know ID format, 
            // but for query reliability:
            const qSent = doc(db, 'friendRequests', `${user.uid}_${targetUid}`);
            const sentSnap = await getDoc(qSent);
            if (sentSnap.exists()) return 'sent';

            // 3. Check if I received a request
            const qReceived = doc(db, 'friendRequests', `${targetUid}_${user.uid}`);
            const recSnap = await getDoc(qReceived);
            if (recSnap.exists()) return 'received';

            return 'none';
        } catch (e) {
            console.error("Error checking friendship", e);
            return 'none';
        }
    };

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
