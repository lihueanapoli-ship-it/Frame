import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../api/firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
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
    if (!context) {
        throw new Error('useUserProfile must be used within UserProfileProvider');
    }
    return context;
};

export const UserProfileProvider = ({ children }) => {
    const { user } = useAuth();

    // Estado del perfil
    const [profile, setProfile] = useState(null);
    const [expertiseLevel, setExpertiseLevel] = useState('novice');
    const [uiConfig, setUIConfig] = useState(getUIConfigForLevel('novice'));
    const [insights, setInsights] = useState({
        topGenres: [],
        favoriteDecade: null,
        currentStreak: 0
    });
    const [loading, setLoading] = useState(true);

    // ========================================
    // LOAD PROFILE FROM FIREBASE
    // ========================================
    useEffect(() => {
        if (!user || !db) {
            setLoading(false);
            return;
        }

        const loadProfile = async () => {
            try {
                const profileRef = doc(db, 'userProfiles', user.uid);
                const profileSnap = await getDoc(profileRef);

                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    setProfile(data);

                    // Calcular expertise level
                    const level = calculateExpertiseLevel(data);
                    setExpertiseLevel(level);
                    setUIConfig(getUIConfigForLevel(level));

                    // Calcular insights
                    calculateInsights(data);
                } else {
                    // Crear perfil inicial
                    const initialProfile = {
                        userId: user.uid,
                        createdAt: new Date().toISOString(),
                        behaviorMetrics: {
                            searchCount: 0,
                            filterUsage: 0,
                            statsViewCount: 0,
                            reviewsWritten: 0,
                            currentStreak: 0
                        },
                        activityLog: [new Date().toISOString()], // Primera actividad
                        onboardingCompleted: false,
                        preferences: {
                            theme: 'dark',
                            language: 'es-MX',
                            reducedMotion: false
                        },
                        // Fase 5: Social & Monetization Foundation
                        username: user.displayName
                            ? user.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000)
                            : `user${Math.floor(Math.random() * 10000)}`,
                        isPro: false,
                        privacySettings: {
                            profileVisibility: 'public', // public, friends, private
                            showActivity: true
                        },
                        customLists: [],
                        social: {
                            followersCount: 0,
                            followingCount: 0
                        }
                    };

                    await setDoc(profileRef, initialProfile);
                    setProfile(initialProfile);
                    setExpertiseLevel('novice');
                    setUIConfig(getUIConfigForLevel('novice'));
                }
            } catch (error) {
                console.error('Error loading user profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [user]);

    // ========================================
    // CALCULATE INSIGHTS
    // ========================================
    const calculateInsights = (profileData) => {
        // Estos datos vienen de MovieContext, pero podemos obtenerlos del profile si los guardamos
        const movieData = profileData.movieData || { watched: [], watchlist: [] };

        const topGenres = analyzeGenrePreferences(movieData.watched);
        const favoriteDecade = analyzeDecadePreference(movieData.watched);
        const currentStreak = calculateCurrentStreak(profileData.activityLog || []);

        setInsights({
            topGenres,
            favoriteDecade,
            currentStreak
        });
    };

    // ========================================
    // TRACK BEHAVIOR
    // ========================================
    const trackBehavior = async (metricName, incrementValue = 1) => {
        if (!user || !db) return;

        try {
            const profileRef = doc(db, 'userProfiles', user.uid);

            // Incrementar métrica
            await updateDoc(profileRef, {
                [`behaviorMetrics.${metricName}`]: increment(incrementValue),
                // Agregar timestamp a activity log
                activityLog: [...(profile?.activityLog || []), new Date().toISOString()]
            });

            // Update local state
            setProfile(prev => {
                if (!prev) return prev;

                const updated = {
                    ...prev,
                    behaviorMetrics: {
                        ...prev.behaviorMetrics,
                        [metricName]: (prev.behaviorMetrics[metricName] || 0) + incrementValue
                    },
                    activityLog: [...prev.activityLog, new Date().toISOString()]
                };

                // Re-calcular expertise level
                const newLevel = calculateExpertiseLevel(updated);
                if (newLevel !== expertiseLevel) {
                    setExpertiseLevel(newLevel);
                    setUIConfig(getUIConfigForLevel(newLevel));

                    // Mostrar notificación de "level up"
                    console.log(`🎉 Level Up! Ahora sos ${newLevel}`);
                }

                return updated;
            });
        } catch (error) {
            console.error('Error tracking behavior:', error);
        }
    };

    // ========================================
    // UPDATE MOVIE DATA (llamado desde MovieContext)
    // ========================================
    const updateMovieData = async (watched, watchlist) => {
        if (!user || !db) return;

        try {
            const profileRef = doc(db, 'userProfiles', user.uid);

            await updateDoc(profileRef, {
                'movieData.watched': watched,
                'movieData.watchlist': watchlist,
                lastUpdated: new Date().toISOString()
            });

            // Update local state
            setProfile(prev => {
                if (!prev) return prev;

                const updated = {
                    ...prev,
                    movieData: { watched, watchlist }
                };

                // Re-calcular insights y expertise
                calculateInsights(updated);
                const newLevel = calculateExpertiseLevel(updated);
                if (newLevel !== expertiseLevel) {
                    setExpertiseLevel(newLevel);
                    setUIConfig(getUIConfigForLevel(newLevel));
                }

                return updated;
            });
        } catch (error) {
            console.error('Error updating movie data:', error);
        }
    };

    // ========================================
    // COMPLETE ONBOARDING
    // ========================================
    const completeOnboarding = async () => {
        if (!user || !db) return;

        try {
            const profileRef = doc(db, 'userProfiles', user.uid);
            await updateDoc(profileRef, {
                onboardingCompleted: true,
                onboardingCompletedAt: new Date().toISOString()
            });

            setProfile(prev => ({
                ...prev,
                onboardingCompleted: true
            }));
        } catch (error) {
            console.error('Error completing onboarding:', error);
        }
    };

    // ========================================
    // UPDATE PREFERENCES
    // ========================================
    const updatePreferences = async (newPreferences) => {
        if (!user || !db) return;

        try {
            const profileRef = doc(db, 'userProfiles', user.uid);
            await updateDoc(profileRef, {
                preferences: { ...profile.preferences, ...newPreferences }
            });

            setProfile(prev => ({
                ...prev,
                preferences: { ...prev.preferences, ...newPreferences }
            }));
        } catch (error) {
            console.error('Error updating preferences:', error);
        }
    };

    // ========================================
    // FASE 5: SOCIAL & PRO UTILS
    // ========================================

    // Toggle PRO status (Dev/Mock)
    const toggleProStatus = async () => {
        if (!user || !profile) return;
        const newStatus = !profile.isPro;
        try {
            await updateDoc(doc(db, 'userProfiles', user.uid), { isPro: newStatus });
            setProfile(prev => ({ ...prev, isPro: newStatus }));
            console.log(`👑 User is now ${newStatus ? 'PRO' : 'Basic'}`);
        } catch (e) {
            console.error('Error toggling PRO:', e);
            // Fallback local update if DB fails or using simple Mock
            setProfile(prev => ({ ...prev, isPro: newStatus }));
        }
    };

    // Update Privacy
    const updatePrivacy = async (key, value) => {
        if (!user || !profile) return;
        const newSettings = { ...profile.privacySettings, [key]: value };
        try {
            await updateDoc(doc(db, 'userProfiles', user.uid), { privacySettings: newSettings });
            setProfile(prev => ({ ...prev, privacySettings: newSettings }));
        } catch (e) {
            console.error('Error updating privacy:', e);
        }
    };

    // Check Paywall Access
    const checkAccess = (feature) => {
        // Feature Flags Map
        const PRO_FEATURES = ['audio_feedback', 'advanced_stats', 'unlimited_lists'];
        if (PRO_FEATURES.includes(feature) && !profile?.isPro) {
            return false;
        }
        return true;
    };


    const value = {
        profile,
        expertiseLevel,
        uiConfig,
        insights,
        loading,

        // Actions
        trackBehavior,
        updateMovieData,
        completeOnboarding,
        updatePreferences,

        // Social & Pro
        toggleProStatus,
        updatePrivacy,
        checkAccess
    };

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    );
};
