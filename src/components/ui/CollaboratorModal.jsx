import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UserPlusIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { db } from '../../api/firebase';
import { collection, query, where, getDocs, limit, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

const CollaboratorModal = ({ isOpen, onClose, listId, currentCollaborators = [] }) => {
    const { user: currentUser } = useAuth();
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
                limit(5)
            );
            const snap = await getDocs(q);
            setResults(snap.docs
                .map(d => ({ uid: d.id, ...d.data() }))
                .filter(u => u.uid !== currentUser?.uid && !currentCollaborators.includes(u.uid))
            );
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleInvite = async (targetUser) => {
        setActionLoading(prev => ({ ...prev, [targetUser.uid]: true }));
        try {
            const listRef = doc(db, 'lists', listId);
            await updateDoc(listRef, {
                collaborators: arrayUnion(targetUser.uid)
            });
            toast.success(`${targetUser.displayName} añadido como colaborador`);
            setResults(prev => prev.filter(u => u.uid !== targetUser.uid));
        } catch (error) {
            console.error(error);
            toast.error("Error al añadir colaborador");
        }
        setActionLoading(prev => ({ ...prev, [targetUser.uid]: false }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-[30px]">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-7xl h-[calc(100vh-60px)] sm:h-[calc(100vh-60px)] bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
                    >
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Añadir Colaboradores</h3>
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
                                    placeholder="Buscar por @usuario para invitar..."
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white text-lg focus:outline-none focus:border-primary/50 transition-all font-display"
                                />
                            </div>

                            <div className="flex-1">
                                {results.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {results.map(res => (
                                            <div key={res.uid} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <img src={res.photoURL || "/logo.png"} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
                                                    <div className="truncate">
                                                        <p className="font-bold text-white truncate">{res.displayName}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono italic">@{res.username}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleInvite(res)}
                                                    disabled={actionLoading[res.uid]}
                                                    className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-black transition-all disabled:opacity-50"
                                                >
                                                    <UserPlusIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : searchTerm.length > 1 && !loading ? (
                                    <div className="text-center py-20 text-gray-500 italic">No se encontraron usuarios disponibles.</div>
                                ) : (
                                    <div className="text-center py-20 opacity-30 flex flex-col items-center">
                                        <UserPlusIcon className="w-12 h-12 mb-4" />
                                        <p className="text-sm">Buscá a alguien para colaborar en esta lista</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-center">
                            <button onClick={onClose} className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-full text-sm font-bold text-white transition-all">Cerrar</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CollaboratorModal;
