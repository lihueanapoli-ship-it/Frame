import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShareIcon, PencilIcon, CheckCircleIcon, RectangleStackIcon, StarIcon, ArrowLeftIcon, Squares2X2Icon, ListBulletIcon, ChevronRightIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import MovieCard from '../components/MovieCard';
import ShareModal from '../components/ui/ShareModal';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { db } from '../api/firebase';
import { collection, query, where, getDocs, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import MovieDetail from '../components/MovieDetail';

const PublicProfileView = ({ onSelectMovie }) => {
    const { username } = useParams();
    const { user: currentUser } = useAuth();
    const { followUser, unfollowUser, isUserFollowing } = useUserProfile();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userMovies, setUserMovies] = useState({ watchlist: [], watched: [], favorites: [] });

    const [isFollowing, setIsFollowing] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ displayName: '', bio: '' });

    const [lists, setLists] = useState([]); // Renamed from publicLists
    const [activeFolder, setActiveFolder] = useState(null); // 'watchlist' | 'watched' | 'favorites' | null
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [selectedMovie, setSelectedMovie] = useState(null);


    useEffect(() => {
        const fetchPublicProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                let targetUid = null;
                let profileData = null;

                // 1. Resolve User ID
                if (username === 'me' && currentUser) {
                    targetUid = currentUser.uid;
                } else if (currentUser && username === currentUser.displayName?.replace(/\s+/g, '').toLowerCase()) {
                    targetUid = currentUser.uid;
                } else {
                    try {
                        const q = query(collection(db, 'userProfiles'), where('username', '==', username), limit(1));
                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                            const userDoc = querySnapshot.docs[0];
                            targetUid = userDoc.id;
                            profileData = userDoc.data();
                        } else {
                            const docRef = doc(db, 'userProfiles', username);
                            const docSnap = await getDoc(docRef);
                            if (docSnap.exists()) {
                                targetUid = docSnap.id;
                                profileData = docSnap.data();
                            }
                        }
                    } catch (e) {
                        console.warn("User fetch failed", e);
                    }
                }

                // 2. Fetch Profile Data (Try userProfiles first, then users fallback)
                if (targetUid) {
                    try {
                        // Parallel fetch for best data availability
                        const [profileSnap, userSnap] = await Promise.all([
                            getDoc(doc(db, 'userProfiles', targetUid)),
                            getDoc(doc(db, 'users', targetUid))
                        ]);

                        let finalProfile = { uid: targetUid };

                        // Legacy User Data (Auth/Social basics)
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            finalProfile = {
                                ...finalProfile,
                                displayName: userData.displayName,
                                photoURL: userData.photoURL,
                                ...userData
                            };
                        }

                        // New Profile Data (Bio, Stats, Overrides)
                        if (profileSnap.exists()) {
                            const profileData = profileSnap.data();
                            finalProfile = {
                                ...finalProfile,
                                ...profileData, // Overwrite with explicit profile settings
                                // Prefer profile photo/name if set, otherwise keep legacy
                                displayName: profileData.displayName || finalProfile.displayName,
                                photoURL: profileData.photoURL || finalProfile.photoURL,
                                bio: profileData.bio || finalProfile.bio || ''
                            };
                        }

                        setProfile(finalProfile);
                        setEditForm({
                            displayName: finalProfile.displayName || '',
                            bio: finalProfile.bio || ''
                        });

                        // 3. Fetch Content (Independent Try/Catches for robustness)

                        // A. Lists
                        try {
                            const listsQuery = query(collection(db, 'lists'), where('ownerId', '==', targetUid));
                            const listSnap = await getDocs(listsQuery);
                            setLists(listSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                        } catch (err) {
                            console.error("Error fetching lists", err);
                        }

                        // B. User Movies (Watchlist)
                        try {
                            const userMoviesRef = collection(db, 'users', targetUid, 'movies');
                            const userMoviesSnap = await getDocs(userMoviesRef);
                            console.log("DEBUG APP: User Movies docs found:", userMoviesSnap.size);

                            const newMovies = { watchlist: [], watched: [], favorites: [] };
                            userMoviesSnap.docs.forEach(doc => {
                                const data = doc.data();
                                // console.log("DEBUG APP: Movie Doc:", doc.id, data);
                                if (data.isInWatchlist) newMovies.watchlist.push(data);
                                if (data.isWatched) newMovies.watched.push(data);
                                if (data.isFavorite) newMovies.favorites.push(data);
                            });
                            console.log("DEBUG APP: Filtered Watchlist length:", newMovies.watchlist.length);
                            setUserMovies(newMovies);
                        } catch (err) {
                            console.error("DEBUG APP: Error fetching user movies", err);
                            // If this fails, it's likely a permission issue. 
                            // We don't want to alert the user aggressively, but we know it's failing.
                        }

                    } catch (e) {
                        console.error("Profile fetch failed", e);
                        setError("Error cargando perfil");
                    }
                } else {
                    // FALLBACK if no targetUid found (e.g. invalid username)
                    setError("Usuario no encontrado.");
                }

                // Check Follow Status
                if (currentUser && targetUid && currentUser.uid !== targetUid) {
                    try {
                        const following = await isUserFollowing(targetUid);
                        setIsFollowing(following);
                    } catch (e) { }
                }

            } catch (err) {
                console.error(err);
                setError("Error cargando perfil");
            } finally {
                setLoading(false);
            }
        };

        fetchPublicProfile();
    }, [username, currentUser, isUserFollowing]);

    const handleFollowToggle = async () => {
        if (!currentUser || !profile) return;
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await unfollowUser(profile.uid);
                setIsFollowing(false);
                setProfile(prev => ({
                    ...prev,
                    social: { ...prev.social, followersCount: (prev.social?.followersCount || 1) - 1 }
                }));
            } else {
                await followUser({
                    uid: profile.uid,
                    displayName: profile.displayName,
                    photoURL: profile.photoURL
                });
                setIsFollowing(true);
                setProfile(prev => ({
                    ...prev,
                    social: { ...prev.social, followersCount: (prev.social?.followersCount || 0) + 1 }
                }));
            }
        } catch (error) {
            console.error("Follow action failed", error);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!currentUser || !profile) return;
        try {
            const userRef = doc(db, 'userProfiles', profile.uid);
            await updateDoc(userRef, {
                displayName: editForm.displayName,
                bio: editForm.bio
            });

            setProfile(prev => ({ ...prev, ...editForm }));
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            // Handling if document doesn't exist yet (first edit) would require setDoc with merge
        }
    };

    if (loading) return <div className="min-h-screen bg-background" />;

    if (error || !profile) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
            <UserCircleIcon className="w-16 h-16 text-gray-700 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Perfil no disponible</h2>
            <button onClick={() => navigate('/')} className="text-primary hover:underline">Volver al Inicio</button>
        </div>
    );

    const isOwnProfile = currentUser && (profile.uid === currentUser.uid);

    // --- RENDER HELPERS ---

    const renderCollectionCard = (title, count, type, coverUrl, onClick) => (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="group relative aspect-square bg-surface-elevated rounded-2xl overflow-hidden border border-white/5 cursor-pointer hover:border-white/20 transition-all"
        >
            {coverUrl ? (
                <img src={coverUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0" />
            )}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

            <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-1">
                    {type === 'watchlist' && <BookmarkIcon className="w-5 h-5 text-primary" />}
                    {type === 'watched' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                    {type === 'favorites' && <StarIcon className="w-5 h-5 text-yellow-500" />}
                    {type === 'custom' && <RectangleStackIcon className="w-5 h-5 text-blue-400" />}
                    <h3 className="font-bold text-xl text-white tracking-tight">{title}</h3>
                </div>
                <p className="text-sm text-gray-400 font-mono">{count} títulos</p>
            </div>
        </motion.div>
    );

    const renderMovieGrid = (movies) => (
        <div className={cn(
            "grid gap-4",
            viewMode === 'grid' ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-1"
        )}>
            {movies.map(movie => (
                <div key={movie.id} onClick={() => setSelectedMovie(movie)}>
                    {viewMode === 'grid' ? (
                        <MovieCard movie={movie} />
                    ) : (
                        <div className="flex items-center gap-4 p-3 bg-surface-elevated hover:bg-white/5 border border-white/5 rounded-xl transition-colors cursor-pointer group">
                            <img
                                src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                alt=""
                                className="w-10 h-14 object-cover rounded shadow-sm opacity-80 group-hover:opacity-100"
                            />
                            <div className="flex-1">
                                <h4 className="font-bold text-white group-hover:text-primary transition-colors">{movie.title}</h4>
                                <p className="text-xs text-gray-500">{movie.release_date?.split('-')[0]}</p>
                            </div>
                            <div className="p-2 text-gray-500">
                                <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    // --- MAIN RENDER ---

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* PROFILE HEADER code remains similar, keeping it concise here */}
            {profile && (
                <div className="relative pt-20 px-4 pb-8 mb-4 border-b border-white/5">
                    <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
                        {/* Avatar & Info */}
                        <div className="relative group">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-br from-white/10 to-transparent border border-white/10">
                                <img src={profile.photoURL || "/logo.png"} alt={profile.displayName} className="w-full h-full rounded-full object-cover" />
                            </div>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2">{profile.displayName}</h1>
                            <p className="text-gray-400 font-mono text-sm max-w-lg mx-auto md:mx-0">
                                {profile.bio || "Amante del cine. Sin biografía aún."}
                            </p>
                            {/* Stats Row */}
                            <div className="flex items-center justify-center md:justify-start gap-6 mt-4 text-sm font-medium text-gray-400">
                                <div><span className="text-white font-bold">{lists.length}</span> Listas</div>
                                <div><span className="text-white font-bold">{userMovies.watched?.length || 0}</span> Vistas</div>
                                <div><span className="text-white font-bold">{userMovies.watchlist?.length || 0}</span> Por Ver</div>
                            </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end mt-4 md:mt-0">
                            {!isOwnProfile && !isFollowing && (
                                <button
                                    onClick={handleFollowToggle}
                                    disabled={followLoading}
                                    className="px-8 py-2.5 bg-white text-black rounded-full font-bold text-sm transition-all shadow-lg hover:bg-gray-200 active:scale-95"
                                >
                                    {followLoading ? '...' : 'Seguir'}
                                </button>
                            )}

                            {isOwnProfile && (
                                <>
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-6 py-2.5 bg-surface border border-white/10 rounded-full font-medium text-sm text-gray-300 hover:text-white hover:bg-white/5"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleSaveProfile}
                                                className="px-6 py-2.5 bg-primary text-black rounded-full font-bold text-sm hover:bg-white transition-all shadow-lg"
                                            >
                                                Guardar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-6 py-2.5 bg-surface border border-white/10 rounded-full font-medium text-sm text-white hover:bg-white/5 transition-all flex items-center gap-2"
                                        >
                                            <PencilIcon className="w-4 h-4" /> Editar
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* BREADCRUMB / NAVIGATION */}
            {activeFolder && (
                <div className="max-w-7xl mx-auto px-4 mb-6 flex items-center justify-between animate-fade-in">
                    <button
                        onClick={() => setActiveFolder(null)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Volver a Colección
                    </button>

                    <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white/10 text-white shadow" : "text-gray-500 hover:text-white")}
                            title="Vista Cuadrícula"
                        >
                            <Squares2X2Icon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white/10 text-white shadow" : "text-gray-500 hover:text-white")}
                            title="Vista Lista"
                        >
                            <ListBulletIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* CONTENT AREA */}
            <div className="max-w-7xl mx-auto px-4">
                <AnimatePresence mode="wait">
                    {!activeFolder ? (
                        <motion.div
                            key="hub"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                        >
                            {/* 1. Watchlist (System) - ALWAYS FIRST */}
                            {renderCollectionCard(
                                "Por Ver",
                                userMovies.watchlist?.length || 0,
                                'watchlist',
                                userMovies.watchlist?.[0] ? `https://image.tmdb.org/t/p/w500${userMovies.watchlist[0].poster_path}` : null,
                                () => setActiveFolder('watchlist')
                            )}

                            {/* 2. Custom Lists (Treating them as part of the 'Watchlist' ecosystem as requested) */}
                            {lists.map(list => (
                                renderCollectionCard(
                                    list.name,
                                    list.movies?.length || 0,
                                    'custom',
                                    list.movies?.[0] ? `https://image.tmdb.org/t/p/w500${list.movies[0].poster_path}` : null,
                                    () => navigate(`/lists/${list.id}`)
                                )
                            ))}

                            {lists.length === 0 && !userMovies.watchlist?.length && (
                                <div className="col-span-full py-12 text-center text-gray-500 border border-white/5 border-dashed rounded-2xl">
                                    <RectangleStackIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Este usuario aún no tiene listas ni películas por ver.</p>
                                </div>
                            )}

                        </motion.div>
                    ) : (
                        <motion.div
                            key="detail"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="mb-6">
                                <h2 className="text-3xl font-display font-bold text-white mb-2">
                                    {activeFolder === 'watchlist' && 'Por Ver'}
                                    {activeFolder === 'watched' && 'Historial de Vistas'}
                                    {activeFolder === 'favorites' && 'Favoritos'}
                                </h2>
                                <p className="text-gray-500 font-mono text-sm">
                                    Explorando colección de {profile.displayName}
                                </p>
                            </div>

                            {userMovies[activeFolder] && userMovies[activeFolder].length > 0 ? (
                                renderMovieGrid(userMovies[activeFolder])
                            ) : (
                                <div className="py-20 text-center text-gray-500">
                                    Esta colección está vacía.
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {isShareOpen && profile && (
                    <ShareModal
                        isOpen={isShareOpen}
                        onClose={() => setIsShareOpen(false)}
                        data={{
                            title: profile.displayName,
                            subtitle: `@${profile.username} • Cinéfilo en FRAME`,
                            movies: [], // Changed from activeTab === 'lists' ? [] : movies, as activeTab is removed
                            type: 'profile'
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default PublicProfileView;
