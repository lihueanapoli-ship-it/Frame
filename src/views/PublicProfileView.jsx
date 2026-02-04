import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCircleIcon, LockClosedIcon, ShareIcon } from '@heroicons/react/24/outline';
import MovieCard from '../components/MovieCard';
import ShareModal from '../components/ui/ShareModal';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { db } from '../api/firebase';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';

const PublicProfileView = ({ onSelectMovie }) => {
    const { username } = useParams();
    const { user: currentUser } = useAuth();
    const { followUser, unfollowUser, isUserFollowing } = useUserProfile();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [movies, setMovies] = useState([]);

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
                        console.warn("User fetch failed (likely permissions or index)", e);
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

                    // Fetch Lists (Protected)
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
                        } catch (listErr) {
                            console.warn("⚠️ Could not fetch user lists.", listErr);
                            setPublicLists([]);
                        }
                    }
                } else {
                    // FALLBACK: Auth Context Reconstruction
                    if (currentUser && (username === 'me' || targetUid === currentUser.uid)) {
                        console.log("⚠️ Using Auth Fallback for Profile");
                        setProfile({
                            uid: currentUser.uid,
                            displayName: currentUser.displayName || 'Usuario',
                            username: 'me',
                            photoURL: currentUser.photoURL,
                            bio: 'Bienvenido a tu perfil.',
                            social: { followersCount: 0, followingCount: 0 },
                            stats: { moviesWatched: 0 },
                            isPro: false
                        });
                        setPublicLists([]);
                    } else if (username !== 'me') {
                        // Mock for demo if not found
                        setError("Usuario no encontrado.");
                    }
                }

                // Check Follow Status
                if (currentUser && targetUid && currentUser.uid !== targetUid) {
                    try {
                        const following = await isUserFollowing(targetUid);
                        setIsFollowing(following);
                    } catch (e) {
                        console.warn("Follow check failed", e);
                    }
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

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

    if (error || !profile) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
            <UserCircleIcon className="w-20 h-20 text-gray-600 mb-4" />
            <h2 className="text-2xl font-display font-bold text-white mb-2">Perfil inaccesible</h2>
            <p className="text-gray-400 mb-6">{error || "Este usuario no existe o es privado."}</p>
            <button onClick={() => navigate('/')} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">Volver al Inicio</button>
        </div>
    );

    const isOwnProfile = currentUser && (profile.uid === currentUser.uid);

    return (
        <div className="min-h-screen pb-20">
            {/* 1. HERO COVER */}
            <div className="relative h-64 md:h-80 w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505]" />
                {publicLists && publicLists[0]?.movies?.[0] ? (
                    <img src={`https://image.tmdb.org/t/p/original${publicLists[0].movies[0].poster_path}`} alt="Cover" className="w-full h-full object-cover opacity-40 blur-sm scale-105" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
                )}
            </div>

            {/* 2. PROFILE INFO */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-24 relative z-10">
                <div className="flex flex-col md:flex-row items-end md:items-end gap-6 mb-8">
                    {/* Avatar */}
                    <div className="relative group">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#050505] bg-surface-elevated overflow-hidden shadow-2xl">
                            <img src={profile.photoURL || "/logo.png"} alt={profile.displayName} className="w-full h-full object-cover" />
                        </div>
                        {profile.isPro && (
                            <div className="absolute bottom-2 right-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-lg">PRO</div>
                        )}
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 mb-2 text-center md:text-left">
                        <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-1">{profile.displayName}</h1>
                        <p className="text-primary font-mono text-sm md:text-base mb-4">@{profile.username || 'usuario'}</p>

                        <div className="flex items-center justify-center md:justify-start gap-6 text-sm">
                            <div className="text-center md:text-left">
                                <span className="block font-bold text-white text-lg">{publicLists?.length || 0}</span>
                                <span className="text-gray-500 text-xs uppercase tracking-wider">Listas</span>
                            </div>
                            <div className="text-center md:text-left">
                                <span className="block font-bold text-white text-lg">{profile.social?.followersCount || 0}</span>
                                <span className="text-gray-500 text-xs uppercase tracking-wider">Seguidores</span>
                            </div>
                            <div className="text-center md:text-left">
                                <span className="block font-bold text-white text-lg">{profile.social?.followingCount || 0}</span>
                                <span className="text-gray-500 text-xs uppercase tracking-wider">Seguidos</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="w-full md:w-auto flex gap-3 mb-2">
                        {!isOwnProfile ? (
                            <button
                                onClick={handleFollowToggle}
                                disabled={followLoading}
                                className={cn(
                                    "flex-1 md:flex-none px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                                    isFollowing
                                        ? "bg-surface border border-white/10 text-white hover:bg-white/5"
                                        : "bg-primary text-black hover:bg-primary/90",
                                    followLoading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {followLoading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
                            </button>
                        ) : (
                            <button className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 transition-all">Editar Perfil</button>
                        )}
                        <button onClick={() => setIsShareOpen(true)} className="px-3 py-3 bg-surface border border-white/10 rounded-xl text-white hover:bg-white/5" title="Compartir Perfil">
                            <ShareIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="max-w-2xl bg-white/5 rounded-2xl p-6 border border-white/5 mb-10 backdrop-blur-sm">
                    <p className="text-gray-300 leading-relaxed italic">"{profile.bio || "Este usuario prefiere mantener el misterio sobre sus gustos..."}"</p>
                </div>

                {/* 3. CONTENT TABS */}
                <div className="border-b border-white/10 mb-6 flex gap-6">
                    <button
                        onClick={() => setActiveTab('lists')}
                        className={cn("pb-4 font-bold transition-colors border-b-2", activeTab === 'lists' ? "text-white border-primary" : "text-gray-500 border-transparent hover:text-gray-300")}
                    >
                        Listas ({publicLists?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={cn("pb-4 font-bold transition-colors border-b-2", activeTab === 'favorites' ? "text-white border-primary" : "text-gray-500 border-transparent hover:text-gray-300")}
                    >
                        Favoritos
                    </button>
                </div>

                {/* CONTENT GRID */}
                {activeTab === 'lists' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {publicLists && publicLists.length > 0 ? publicLists.map(list => (
                            <div
                                key={list.id}
                                onClick={() => navigate(`/lists/${list.id}`)}
                                className="group bg-surface-elevated border border-white/5 rounded-xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
                            >
                                <div className="h-32 grid grid-cols-4 bg-black/50 overflow-hidden relative">
                                    {list.movies?.slice(0, 4).map(m => (
                                        <img key={m.id} src={`https://image.tmdb.org/t/p/w200${m.poster_path}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" alt="" />
                                    ))}
                                    {(!list.movies || list.movies.length === 0) && (
                                        <div className="col-span-4 flex items-center justify-center text-gray-700 bg-black/40 h-full">Vacía</div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-elevated to-transparent" />
                                </div>
                                <div className="p-4">
                                    <p className="font-bold text-white text-lg leading-tight mb-1 group-hover:text-primary transition-colors truncate">{list.name}</p>
                                    <span className="text-xs text-gray-400">{list.movieCount || list.movies?.length || 0} Películas</span>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-10 text-center text-gray-500 italic">Este usuario no tiene listas públicas.</div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {movies.length > 0 ? movies.map((movie) => (
                            <div key={movie.id}><MovieCard movie={movie} onClick={onSelectMovie} /></div>
                        )) : (
                            <div className="col-span-full py-10 text-center text-gray-500">
                                <LockClosedIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No hay favoritos visibles.
                            </div>
                        )}
                    </div>
                )}
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
