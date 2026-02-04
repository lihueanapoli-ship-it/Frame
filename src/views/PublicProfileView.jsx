import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShareIcon, PencilIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import MovieCard from '../components/MovieCard';
import ShareModal from '../components/ui/ShareModal';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { db } from '../api/firebase';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { UserCircleIcon, LockClosedIcon } from '@heroicons/react/24/solid';

const PublicProfileView = ({ onSelectMovie }) => {
    const { username } = useParams();
    const { user: currentUser } = useAuth();
    const { followUser, unfollowUser, isUserFollowing } = useUserProfile();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [movies, setMovies] = useState([]); // Favorites

    const [isFollowing, setIsFollowing] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    const [activeTab, setActiveTab] = useState('lists');
    const [publicLists, setPublicLists] = useState([]);

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
                    // Try fetch by username field
                    try {
                        const q = query(collection(db, 'userProfiles'), where('username', '==', username), limit(1));
                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                            const userDoc = querySnapshot.docs[0];
                            targetUid = userDoc.id;
                            profileData = userDoc.data();
                        } else {
                            // Fallback: Check if username is actually a UID
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

                if (targetUid && !profileData) {
                    try {
                        const docRef = doc(db, 'userProfiles', targetUid);
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) {
                            profileData = docSnap.data();
                        }
                    } catch (e) { console.error("Direct profile fetch failed", e); }
                }

                if (profileData) {
                    setProfile({ ...profileData, uid: targetUid || profileData.uid });

                    // Fetch Lists
                    if (targetUid) {
                        try {
                            const listsQuery = query(
                                collection(db, 'lists'),
                                where('ownerId', '==', targetUid),
                                where('privacy', '==', 'public')
                            );
                            const listSnap = await getDocs(listsQuery);
                            const realLists = listSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                            setPublicLists(realLists);
                        } catch (listErr) { setPublicLists([]); }
                    }
                } else {
                    // FALLBACK
                    if (currentUser && (username === 'me' || targetUid === currentUser.uid)) {
                        setProfile({
                            uid: currentUser.uid,
                            displayName: currentUser.displayName || 'Usuario',
                            username: 'me',
                            photoURL: currentUser.photoURL,
                            bio: '',
                            social: { followersCount: 0, followingCount: 0 },
                            stats: { moviesWatched: 0 },
                            isPro: false
                        });
                        setPublicLists([]);
                    } else if (username !== 'me') {
                        setError("Usuario no encontrado.");
                    }
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

    if (loading) return <div className="min-h-screen bg-background" />;

    if (error || !profile) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
            <UserCircleIcon className="w-16 h-16 text-gray-700 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Perfil no disponible</h2>
            <button onClick={() => navigate('/')} className="text-primary hover:underline">Volver al Inicio</button>
        </div>
    );

    const isOwnProfile = currentUser && (profile.uid === currentUser.uid);

    return (
        <div className="min-h-screen pb-20 bg-background pt-20">
            <div className="max-w-4xl mx-auto px-4">

                {/* 1. HEADER CLEAN LAYOUT */}
                <div className="flex flex-col items-center text-center mb-10 animate-fade-in-up">
                    {/* Avatar */}
                    <div className="relative mb-4">
                        <div className="w-28 h-28 md:w-36 md:h-36 rounded-full p-1 bg-gradient-to-br from-white/10 to-transparent">
                            <img
                                src={profile.photoURL || "/logo.png"}
                                alt={profile.displayName}
                                className="w-full h-full object-cover rounded-full bg-surface-elevated"
                            />
                        </div>
                        {profile.isPro && (
                            <span className="absolute bottom-1 right-2 bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">PRO</span>
                        )}
                    </div>

                    {/* Basic Info */}
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-1">{profile.displayName}</h1>
                    <p className="text-gray-400 text-sm md:text-base mb-4 font-mono">
                        {profile.username !== 'me' ? `@${profile.username}` : ''}
                    </p>

                    {/* Stats Row */}
                    <div className="flex items-center gap-6 text-sm mb-6 border-y border-white/5 py-3 px-8 bg-white/[0.02] rounded-full">
                        <div className="flex flex-col">
                            <span className="font-bold text-white">{publicLists?.length || 0}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Listas</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="font-bold text-white">{profile.social?.followersCount || 0}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Fans</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="font-bold text-white">{profile.social?.followingCount || 0}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Siguiendo</span>
                        </div>
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                        <p className="text-gray-300 max-w-lg mb-6 leading-relaxed text-sm md:text-base">
                            {profile.bio}
                        </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        {!isOwnProfile ? (
                            <button
                                onClick={handleFollowToggle}
                                disabled={followLoading}
                                className={cn(
                                    "px-8 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg active:scale-95",
                                    isFollowing
                                        ? "bg-surface border border-white/10 text-white hover:bg-white/5"
                                        : "bg-white text-black hover:bg-gray-200"
                                )}
                            >
                                {followLoading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
                            </button>
                        ) : (
                            <button className="px-6 py-2.5 bg-surface border border-white/10 rounded-full font-medium text-sm text-white hover:bg-white/5 transition-all flex items-center gap-2">
                                <PencilIcon className="w-4 h-4" /> Editar
                            </button>
                        )}
                        <button
                            onClick={() => setIsShareOpen(true)}
                            className="p-2.5 bg-surface border border-white/10 rounded-full text-white hover:bg-white/5 transition-all"
                            title="Compartir"
                        >
                            <ShareIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 2. TABS & CONTENT */}
                <div className="w-full">
                    <div className="flex justify-center border-b border-white/10 mb-8">
                        <button
                            onClick={() => setActiveTab('lists')}
                            className={cn("px-8 py-3 text-sm font-bold border-b-2 transition-colors relative", activeTab === 'lists' ? "text-white border-primary" : "text-gray-500 border-transparent hover:text-gray-300")}
                        >
                            Listas
                            {activeTab === 'lists' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_-10px_20px_rgba(45,212,191,0.5)]" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('favorites')}
                            className={cn("px-8 py-3 text-sm font-bold border-b-2 transition-colors relative", activeTab === 'favorites' ? "text-white border-primary" : "text-gray-500 border-transparent hover:text-gray-300")}
                        >
                            Favoritos
                            {activeTab === 'favorites' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_-10px_20px_rgba(45,212,191,0.5)]" />}
                        </button>
                    </div>

                    {/* CONTENT GRID */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'lists' ? (
                            <motion.div
                                key="lists"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            >
                                {publicLists && publicLists.length > 0 ? publicLists.map((list, idx) => (
                                    <div
                                        key={list.id}
                                        onClick={() => navigate(`/lists/${list.id}`)}
                                        className="group bg-surface border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 hover:bg-surface-elevated transition-all cursor-pointer shadow-sm hover:shadow-xl"
                                    >
                                        <div className="h-40 grid grid-cols-4 bg-black/40 overflow-hidden relative isolate">
                                            {list.movies?.slice(0, 4).map((m, i) => (
                                                <img key={m.id || i} src={`https://image.tmdb.org/t/p/w200${m.poster_path}`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt="" />
                                            ))}
                                            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />
                                            {(!list.movies || list.movies.length === 0) && (
                                                <div className="col-span-4 flex items-center justify-center text-gray-700 h-full font-mono text-xs uppercase tracking-widest">Sin películas</div>
                                            )}
                                        </div>
                                        <div className="p-5 relative">
                                            <p className="font-bold text-white text-lg mb-1 group-hover:text-primary transition-colors truncate">{list.name}</p>
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>{list.movieCount || list.movies?.length || 0} películas</span>
                                                <UserCircleIcon className="w-4 h-4 opacity-50" />
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full py-20 text-center">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <LockClosedIcon className="w-6 h-6 text-gray-600" />
                                        </div>
                                        <p className="text-gray-400 font-medium">Sin listas públicas</p>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="favorites"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
                            >
                                {movies.length > 0 ? movies.map((movie) => (
                                    <MovieCard key={movie.id} movie={movie} onClick={onSelectMovie} />
                                )) : (
                                    <div className="col-span-full py-20 text-center text-gray-500">
                                        No hay favoritos visibles.
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <AnimatePresence>
                {isShareOpen && profile && (
                    <ShareModal
                        isOpen={isShareOpen}
                        onClose={() => setIsShareOpen(false)}
                        data={{
                            title: profile.displayName,
                            subtitle: `@${profile.username} • Cinéfilo en FRAME`,
                            movies: activeTab === 'lists' ? [] : movies,
                            type: 'profile'
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default PublicProfileView;
