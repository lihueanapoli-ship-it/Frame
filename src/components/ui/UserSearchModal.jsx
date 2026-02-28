import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { db } from '../../api/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserSearchModal = ({ isOpen, onClose, onSelectUser }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (searchQuery.trim().length > 1) {
                setLoading(true);
                try {
                    // Search by lowercase 'searchName' for case-insensitive robust search
                    const term = searchQuery.toLowerCase().trim();
                    const q = query(
                        collection(db, 'users'),
                        where('searchName', '>=', term),
                        where('searchName', '<=', term + '\uf8ff'),
                        limit(10)
                    );
                    const snap = await getDocs(q);
                    const foundUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
                    setResults(foundUsers);
                } catch (e) {
                    console.error("Search error", e);
                    setResults([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-[calc(100%-2rem)] max-w-lg bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-50 p-6 md:p-8 flex flex-col max-h-[85vh]"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-display font-bold text-white">Buscar Amigos</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="relative mb-6">
                            <input
                                type="text"
                                name="searchUsers"
                                id="search-users-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Escribe un nombre y apellido..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                            {loading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                            ) : results.length > 0 ? (
                                results.map(userResult => (
                                    <button
                                        key={userResult.uid}
                                        onClick={() => {
                                            if (onSelectUser) {
                                                onSelectUser(userResult);
                                            } else {
                                                // If we had a public profile page: navigate(`/u/${userResult.uid}`);
                                            }
                                            onClose();
                                        }}
                                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-white/10">
                                            {userResult.photoURL ? (
                                                <img src={userResult.photoURL} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold">
                                                    {userResult.displayName?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white group-hover:text-primary transition-colors">{userResult.displayName}</p>
                                            <p className="text-xs text-gray-500 font-mono">{userResult.email}</p>
                                        </div>
                                    </button>
                                ))
                            ) : searchQuery ? (
                                <div className="text-center py-8 text-gray-500">
                                    <UserCircleIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>No se encontraron usuarios.</p>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-600 font-mono text-xs">
                                    Escribe para empezar a buscar...
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default UserSearchModal;
