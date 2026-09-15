// Fill missing profile fields without replacing existing user data or movie arrays.
export const getMissingProfileFields = (data, user) => {
    const displayName = data.displayName ?? user.displayName ?? 'Usuario';
    const baseName = (displayName || 'user').replace(/\s+/g, '').toLowerCase();
    const defaults = {
        uid: user.uid,
        displayName,
        photoURL: user.photoURL ?? null,
        bio: '',
        searchName: displayName.toLowerCase(),
        username: `${baseName}${user.uid.slice(-8).toLowerCase()}`,
        createdAt: new Date().toISOString(),
        stats: { moviesWatched: 0, minutesWatched: 0, averageRating: 0, favoriteGenre: null },
        gamification: { level: 1, xp: 0, streak: 0, badges: [] },
        activityLog: [new Date().toISOString()],
        onboardingCompleted: false,
        preferences: {
            theme: 'dark', language: 'es-MX', reducedMotion: false,
            excludedGenres: [], excludedCountries: []
        },
        isPro: false,
        privacySettings: { profile: 'public', lists: 'public' },
        customLists: []
    };

    const missing = {};
    for (const [key, value] of Object.entries(defaults)) {
        if (data[key] === undefined || (data[key] === null && key !== 'photoURL')) {
            missing[key] = value;
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            const missingFields = Object.fromEntries(
                Object.entries(value).filter(([field]) => data[key][field] === undefined)
            );
            if (Object.keys(missingFields).length) missing[key] = missingFields;
        }
    }
    if (!data.username) missing.username = defaults.username;
    if (data.uid !== user.uid) missing.uid = user.uid;
    return missing;
};
