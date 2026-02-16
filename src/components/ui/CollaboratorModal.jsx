import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UserPlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../api/firebase';
import { collection, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { toast } from 'sonner';

const CollaboratorModal = ({ isOpen, onClose, listId, currentCollaborators = [] }) => {
    const { user } = useAuth();
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user || !isOpen) return;

        setLoading(true);
        // Fetch 'following' from UserProfiles (New Social System)
        const unsub = onSnapshot(collection(db, 'userProfiles', user.uid, 'following'), (snap) => {
            const friendsData = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
            setFriends(friendsData);
            setLoading(false);
        });

        return () => unsub();
    }, [user, isOpen]);

    const handleInvite = async (friend) => {
        if (currentCollaborators.includes(friend.uid)) {
            toast.info(`${friend.displayName} ya es colaborador.`);
            return;
        }

        try {
            const listRef = doc(db, 'lists', listId);
            await updateDoc(listRef, {
                collaborators: arrayUnion(friend.uid)
            });
            toast.success(`${friend.displayName} agregado como colaborador`);
            onClose(); // Optional: Close modal or keep open to add more
        } catch (error) {
            console.error("Error adding collaborator", error);
            toast.error("Error al invitar colaborador");
        }
    };

    const filteredFriends = friends.filter(f =>
        f.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserPlusIcon className="w-6 h-6 text-primary" />
                        Invitar Colaboradores
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-white/5">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar amigo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Cargando amigos...</div>
                    ) : filteredFriends.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {searchTerm ? "No se encontraron resultados" : "No tienes amigos para invitar aún."}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredFriends.map(friend => {
                                const isAdded = currentCollaborators.includes(friend.uid);
                                return (
                                    <button
                                        key={friend.uid}
                                        onClick={() => handleInvite(friend)}
                                        disabled={isAdded}
                                        className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img src={friend.photoURL || "/logo.png"} className="w-10 h-10 rounded-full object-cover" alt="" />
                                            <div className="text-left">
                                                <p className="font-bold text-white text-sm">{friend.displayName}</p>
                                                <p className="text-xs text-gray-500">@{friend.displayName.replace(/\s+/g, '').toLowerCase()}</p>
                                            </div>
                                        </div>
                                        {isAdded ? (
                                            <span className="text-xs text-green-500 font-bold px-2 py-1 bg-green-500/10 rounded-full">Colaborador</span>
                                        ) : (
                                            <div className="p-2 bg-primary/10 text-primary rounded-full group-hover:bg-primary group-hover:text-black transition-colors">
                                                <UserPlusIcon className="w-5 h-5" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default CollaboratorModal;
