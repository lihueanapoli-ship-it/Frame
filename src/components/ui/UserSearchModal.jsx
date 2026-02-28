import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, MagnifyingGlassIcon, UserPlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { db } from '../../api/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

const UserSearchModal = ({ isOpen, onClose }) => {
    const { user: currentUser } = useAuth();
    const { sendFriendRequest, getFriendshipStatus } = useUserProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({});

    const handleSearch = async (val) => {
        setSearchTerm(val);
        if (val.trim().length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const term = val.toLowerCase().trim();
            const q = query(
                collection(db, 'userProfiles'),
                where('username', '>=', term),
                where('username', '<=', term + '\uf8ff'),
                limit(10)
            );
            const snap = await getDocs(q);
            const users = snap.docs
                .map(d => ({ uid: d.id, ...d.data() }))
                .filter(u => u.uid !== currentUser?.uid);

            // Fetch statuses
            const usersWithStatus = await Promise.all(users.map(async u => ({
                ...u,
                status: await getFriendshipStatus(u.uid)
            })));

            setResults(usersWithStatus);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleConnect = async (targetUser) => {
        if (!currentUser) return;
        setActionLoading(prev => ({ ...prev, [targetUser.uid]: true }));
        try {
            await sendFriendRequest(targetUser);
            setResults(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, status: 'sent' } : u));
        } catch (error) {
            console.error(error);
        }
        setActionLoading(prev => ({ ...prev, [targetUser.uid]: false }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-[30px]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-7xl h-[calc(100vh-60px)] sm:h-[calc(100vh-60px)] bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Buscar Cinéfilos</h3>
                                <div className="h-1 w-8 bg-primary rounded-full mt-1 opacity-50" />
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col custom-scrollbar">
                            <div className="relative mb-8">
                                <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => handleSearch(e.target.value)}
                                    placeholder="Buscar por nombre de usuario..."
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white text-lg focus:outline-none focus:border-primary/50 transition-all font-display"
                                />
                                {loading && (
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                {results.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {results.map(res => (
                                            <div key={res.uid} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group">
                                                <Link to={`/u/${res.username}`} onClick={onClose} className="flex items-center gap-4 flex-1 min-w-0">
                                                    <img src={res.photoURL || "/logo.png"} className="w-12 h-12 rounded-full object-cover border border-white/10" alt="" />
                                                    <div className="truncate">
                                                        <p className="font-bold text-white truncate">{res.displayName}</p>
                                                        <p className="text-xs text-gray-500 font-mono">@{res.username}</p>
                                                    </div>
                                                </Link>

                                                {res.status === 'friend' ? (
                                                    <span className="p-2 text-green-500 bg-green-500/10 rounded-full"><CheckIcon className="w-5 h-5" /></span>
                                                ) : res.status === 'sent' ? (
                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full ring-1 ring-primary/20">Enviado</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleConnect(res)}
                                                        disabled={actionLoading[res.uid]}
                                                        className="p-2.5 bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-black transition-all active:scale-90 disabled:opacity-50"
                                                    >
                                                        <UserPlusIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : searchTerm.length > 1 && !loading ? (
                                    <div className="text-center py-20 bg-white/[0.01] rounded-3xl border border-white/5 border-dashed">
                                        <p className="text-gray-500">No encontramos a ningún cinéfilo con ese nombre.</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 flex flex-col items-center">
                                        <div className="w-16 h-16 bg-white/[0.02] rounded-full flex items-center justify-center mb-4">
                                            <MagnifyingGlassIcon className="w-8 h-8 text-gray-700" />
                                        </div>
                                        <p className="text-gray-500 text-sm max-w-xs">Buscá a tus amigos por su @usuario para compartir listas y ver qué están mirando.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-center">
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-full text-sm font-bold text-white transition-all active:scale-95"
                            >
                                Cerrar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default UserSearchModal;
