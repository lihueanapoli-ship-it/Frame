import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, TrashIcon, UserPlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { db } from '../../api/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useLists } from '../../contexts/ListContext';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ManageListMembersModal = ({ isOpen, onClose, list }) => {
    const { user } = useAuth();
    const { addCollaborator, removeCollaborator } = useLists();

    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const isOwner = user?.uid === list?.ownerId;

    // 1. Fetch Members Details (Owner + Collaborators)
    useEffect(() => {
        if (isOpen && list) {
            fetchMembers();
        }
    }, [isOpen, list]);

    const fetchMembers = async () => {
        setLoadingMembers(true);
        try {
            const memberIds = [list.ownerId, ...(list.collaborators || [])];
            // Remove duplicates just in case
            const uniqueIds = [...new Set(memberIds)];

            // Firestore 'in' query supports up to 10 items. Usually enough for small groups.
            // If > 10, should chunk it. For simplicity, we'll iterate if needed or slice.
            // Let's do individual fetches for simplicity and robustness against limits 
            // since we likely have < 10 people. 
            // Optimized: Create array of promises
            const promises = uniqueIds.map(uid => getDoc(doc(db, 'users', uid)));
            const snaps = await Promise.all(promises);

            const loadedMembers = snaps.map(snap => {
                if (snap.exists()) return { uid: snap.id, ...snap.data() };
                return { uid: snap.id, displayName: 'Usuario desconocido', photoURL: null };
            });

            setMembers(loadedMembers);
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setLoadingMembers(false);
        }
    };

    // 2. Search Users
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (searchQuery.trim().length > 1) {
                setIsSearching(true);
                try {
                    const term = searchQuery.toLowerCase().trim();
                    const q = query(
                        collection(db, 'users'),
                        where('searchName', '>=', term),
                        where('searchName', '<=', term + '\uf8ff'),
                        limit(5)
                    );
                    const snap = await getDocs(q);
                    const found = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
                    // Filter out existing members
                    const existingIds = new Set(members.map(m => m.uid));
                    setSearchResults(found.filter(u => !existingIds.has(u.uid)));
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, members]);

    // Actions
    const handleAdd = async (targetUser) => {
        try {
            await addCollaborator(list.id, targetUser.uid);
            setMembers(prev => [...prev, targetUser]);
            setSearchResults(prev => prev.filter(u => u.uid !== targetUser.uid));
            setSearchQuery('');
        } catch (e) {
            alert("Error al añadir miembro");
        }
    };

    const handleRemove = async (memberUid) => {
        if (!confirm("¿Eliminar a este usuario de la lista?")) return;
        try {
            await removeCollaborator(list.id, memberUid);
            setMembers(prev => prev.filter(m => m.uid !== memberUid));
        } catch (e) {
            alert("Error al eliminar miembro");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 bg-surface-elevated flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-white">Gestionar Acceso</h2>
                                <p className="text-xs text-gray-400">"{list?.name}"</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">

                            {/* 1. Members List */}
                            <section>
                                <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                                    Miembros ({members.length})
                                </h3>

                                {loadingMembers ? (
                                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
                                ) : (
                                    <div className="space-y-3">
                                        {members.map(member => (
                                            <div key={member.uid} className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-white/10 relative">
                                                        {member.photoURL ? (
                                                            <img src={member.photoURL} className="w-full h-full object-cover" alt={member.displayName} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                                                {member.displayName?.[0]}
                                                            </div>
                                                        )}
                                                        {member.uid === list.ownerId && (
                                                            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[8px] px-1 rounded-full font-bold border border-black">
                                                                OWNER
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-tight">
                                                            {member.uid === user.uid ? `${member.displayName} (Tú)` : member.displayName}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500">{member.email}</p>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                {member.uid !== list.ownerId && isOwner && (
                                                    <button
                                                        onClick={() => handleRemove(member.uid)}
                                                        className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Expulsar"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {member.uid === list.ownerId && (
                                                    <span className="text-xs text-yellow-500/50 font-medium px-2 py-1 bg-yellow-500/5 rounded">Dueño</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* 2. Add Members (Only Owner) */}
                            {isOwner && (
                                <section className="pt-4 border-t border-white/5">
                                    <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                                        <UserPlusIcon className="w-4 h-4" /> Añadir Colaboradores
                                    </h3>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Buscar usuario por nombre..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-surface border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-gray-600"
                                        />
                                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
                                    </div>

                                    {/* Search Results */}
                                    {searchResults.length > 0 && (
                                        <div className="mt-2 bg-surface-elevated border border-white/10 rounded-xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-2">
                                            {searchResults.map(res => (
                                                <button
                                                    key={res.uid}
                                                    onClick={() => handleAdd(res)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-primary/20 hover:border-l-2 border-primary transition-all text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                                                        {res.photoURL ? <img src={res.photoURL} className="w-full h-full object-cover" /> : null}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{res.displayName}</p>
                                                        <p className="text-[10px] text-gray-500">{res.email}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {searchQuery.length > 1 && !isSearching && searchResults.length === 0 && (
                                        <p className="text-center text-xs text-gray-600 mt-2">No se encontraron usuarios.</p>
                                    )}
                                </section>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ManageListMembersModal;
