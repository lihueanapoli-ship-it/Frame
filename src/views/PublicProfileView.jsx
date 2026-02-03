import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCircleIcon, LockClosedIcon, UserPlusIcon, EllipsisHorizontalIcon, TrophyIcon, FireIcon, ShareIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid'; // Solid for rating
import MovieCard from '../components/MovieCard';
import ShareModal from '../components/ui/ShareModal';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../api/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { cn } from '../lib/utils';

// Mock Data for layout if fetching fails or purely for design testing
const MOCK_PUBLIC_MOVIES = [
    { id: 27205, title: "Inception", poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", release_date: "2010-07-15", vote_average: 8.4 },
    { id: 157336, title: "Interstellar", poster_path: "/gEU2QniL6E8ahDaNBADBzOLD9J4.jpg", release_date: "2014-11-05", vote_average: 8.4 },
    { id: 155, title: "The Dark Knight", poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", release_date: "2008-07-14", vote_average: 8.5 },
];

const PublicProfileView = ({ onSelectMovie }) => {
    const { username } = useParams();
    const { user: currentUser } = useAuth(); // To check if it's me
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [movies, setMovies] = useState([]);

    // UI State
    const [isFollowing, setIsFollowing] = useState(false); // Mock
    const [isShareOpen, setIsShareOpen] = useState(false);

    useEffect(() => {
        const fetchPublicProfile = async () => {
            setLoading(true);
            try {
                // NOTE: In a real app we'd query by 'username' field. 
                // Since our current DB might not have 'username' indexed on all old docs, 
                // we'll try to simulate or find by ID if the URL mimics it.
                // For this demo, let's assume we are viewing the Current User if url is "me" or matches.

                // --- SIMULATION MODE START ---
                // If we are testing with /u/me or the current user's name
                if (username === 'me' || (currentUser && username === currentUser.displayName?.replace(/\s+/g, '').toLowerCase())) {
                    // Fetch "Self" as public
                    // In real implementation: `await getDoc(doc(db, 'userProfiles', currentUser.uid))`
                    // Here we fake the network delay for effect
                    await new Promise(r => setTimeout(r, 800));

                    setProfile({
                        username: username === 'me' ? (currentUser?.displayName || 'User') : username,
                        displayName: currentUser?.displayName || 'Cinéfilo',
                        photoURL: currentUser?.photoURL,
                        bio: "Amante del cine sci-fi y los thrillers psicológicos. Persiguiendo el plano secuencia perfecto.",
                        stats: {
                            watched: 142,
                            favorites: 24,
                            followers: 89
                        },
                        isPro: true, // Simulation
                        privacy: 'public'
                    });
                    setMovies(MOCK_PUBLIC_MOVIES); // Replace with real fetched movies later
                } else {
                    // Try to find in DB (Phase 2 Implementation)
                    // const q = query(collection(db, 'userProfiles'), where('username', '==', username), limit(1));
                    // ...

                    // Fallback Not Found for now
                    setError("Usuario no encontrado (Modo Simulación: intenta '/u/me')");
                }
                // --- SIMULATION MODE END ---

            } catch (err) {
                console.error(err);
                setError("Error cargando perfil");
            } finally {
                setLoading(false);
            }
        };

        if (username) fetchPublicProfile();
    }, [username, currentUser]);

    // Render Loading
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    // Render Error
    if (error || !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
                <UserCircleIcon className="w-20 h-20 text-gray-600 mb-4" />
                <h2 className="text-2xl font-display font-bold text-white mb-2">Perfil inaccesible</h2>
                <p className="text-gray-400 mb-6">{error || "Este usuario no existe o es privado."}</p>
                <button onClick={() => navigate('/')} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"> Volver al Inicio </button>
            </div>
        );
    }

    const isOwnProfile = username === 'me' || (currentUser && username === currentUser.displayName?.replace(/\s+/g, '').toLowerCase());

    return (
        <div className="min-h-screen pb-20">
            {/* 1. HERO COVER */}
            <div className="relative h-64 md:h-80 w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505]" />
                {/* Simulated dynamic cover based on top movie */}
                <img
                    src={`https://image.tmdb.org/t/p/original${movies[0]?.poster_path}`}
                    alt="Cover"
                    className="w-full h-full object-cover opacity-40 blur-sm scale-105"
                />
            </div>

            {/* 2. PROFILE INFO */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-24 relative z-10">
                <div className="flex flex-col md:flex-row items-end md:items-end gap-6 mb-8">
                    {/* Avatar */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative group"
                    >
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#050505] bg-surface-elevated overflow-hidden shadow-2xl">
                            <img src={profile.photoURL || "/logo.png"} alt={profile.displayName} className="w-full h-full object-cover" />
                        </div>
                        {profile.isPro && (
                            <div className="absolute bottom-2 right-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-lg">
                                PRO
                            </div>
                        )}
                    </motion.div>

                    {/* Text Info */}
                    <div className="flex-1 mb-2 text-center md:text-left">
                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-3xl md:text-5xl font-display font-bold text-white mb-1"
                        >
                            {profile.displayName}
                        </motion.h1>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-primary font-mono text-sm md:text-base mb-4"
                        >
                            @{profile.username}
                        </motion.p>

                        {/* Stats Row */}
                        <div className="flex items-center justify-center md:justify-start gap-6 text-sm">
                            <div className="text-center md:text-left">
                                <span className="block font-bold text-white text-lg">{profile.stats.watched}</span>
                                <span className="text-gray-500 text-xs uppercase tracking-wider">Vistas</span>
                            </div>
                            <div className="text-center md:text-left">
                                <span className="block font-bold text-white text-lg">{profile.stats.followers}</span>
                                <span className="text-gray-500 text-xs uppercase tracking-wider">Seguidores</span>
                            </div>
                            <div className="text-center md:text-left">
                                <span className="block font-bold text-white text-lg flex items-center gap-1 justify-center md:justify-start">
                                    <FireIcon className="w-4 h-4 text-orange-500" /> 12
                                </span>
                                <span className="text-gray-500 text-xs uppercase tracking-wider">Racha</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="w-full md:w-auto flex gap-3 mb-2">
                        {!isOwnProfile ? (
                            <button
                                onClick={() => setIsFollowing(!isFollowing)}
                                className={cn(
                                    "flex-1 md:flex-none px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                                    isFollowing
                                        ? "bg-surface border border-white/10 text-white hover:bg-white/5"
                                        : "bg-primary text-black hover:bg-primary/90"
                                )}
                            >
                                {isFollowing ? 'Siguiendo' : 'Seguir'}
                            </button>
                        ) : (
                            <button className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 transition-all">
                                Editar Perfil
                            </button>
                        )}
                        <button
                            onClick={() => setIsShareOpen(true)}
                            className="px-3 py-3 bg-surface border border-white/10 rounded-xl text-white hover:bg-white/5"
                            title="Compartir Perfil"
                        >
                            <ShareIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Bio */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="max-w-2xl bg-white/5 rounded-2xl p-6 border border-white/5 mb-10 backdrop-blur-sm"
                >
                    <p className="text-gray-300 leading-relaxed italic">"{profile.bio}"</p>
                </motion.div>

                {/* 3. CONTENT TABS (Showcase) */}
                <div className="border-b border-white/10 mb-6 flex gap-6">
                    <button className="pb-4 text-white font-bold border-b-2 border-primary">Favoritos</button>
                    <button className="pb-4 text-gray-500 hover:text-gray-300 font-medium transition-colors">Listas (3)</button>
                    <button className="pb-4 text-gray-500 hover:text-gray-300 font-medium transition-colors">Reseñas</button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {movies.map((movie, index) => (
                        <motion.div
                            key={movie.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + (index * 0.1) }}
                        >
                            <MovieCard
                                movie={movie}
                                onClick={onSelectMovie}
                            // Optional: Show 'rank' or 'rating' badge unique to profile view
                            />
                        </motion.div>
                    ))}

                    {/* Placeholder for "Load More" or Empty State */}
                    {movies.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-500">
                            <LockClosedIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            Este usuario no tiene favoritos públicos.
                        </div>
                    )}
                </div>
            </div>

            {/* SHARE MODAL INTEGRATION */}
            <AnimatePresence>
                {isShareOpen && profile && (
                    <ShareModal
                        isOpen={isShareOpen}
                        onClose={() => setIsShareOpen(false)}
                        data={{
                            title: profile.displayName,
                            subtitle: `@${profile.username} • Cinéfilo en FRAME`,
                            movies: movies, // Uses profile showcase movies for the visual collage
                            type: 'profile'
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default PublicProfileView;
