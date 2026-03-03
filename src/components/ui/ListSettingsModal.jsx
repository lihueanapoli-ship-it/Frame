import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UserPlusIcon, CheckIcon, MagnifyingGlassIcon, UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline';
import { db } from '../../api/firebase';
import { collection, query, where, getDocs, limit, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useLists } from '../../contexts/ListContext';
import { toast } from 'sonner';
import useScrollLock from '../../hooks/useScrollLock';

const ListSettingsModal = ({ isOpen, onClose, list, onUpdate }) => {
    useScrollLock(isOpen);
    const { user } = useAuth();
    const { updateList, addCollaborator, removeCollaborator } = useLists();
    const [name, setName] = useState(list?.name || '');
    const [description, setDescription] = useState(list?.description || '');
    const [icon, setIcon] = useState(list?.icon || '📑');
    const [loading, setLoading] = useState(false);

    // Member management
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [collaboratorsProfiles, setCollaboratorsProfiles] = useState([]);

    useEffect(() => {
        const fetchCollabs = async () => {
            if (!list?.collaborators?.length) {
                setCollaboratorsProfiles([]);
                return;
            }
            try {
                const profiles = [];
                for (const uid of list.collaborators) {
                    const d = await getDocs(query(collection(db, 'userProfiles'), where('uid', '==', uid), limit(1)));
                    if (!d.empty) {
                        profiles.push({ uid, ...d.docs[0].data() });
                    } else {
                        profiles.push({ uid, displayName: 'Usuario', photoURL: '/logo.png', username: 'anon' });
                    }
                }
                setCollaboratorsProfiles(profiles);
            } catch (e) {
                console.error("Error fetching collab profiles", e);
            }
        };
        fetchCollabs();
    }, [list?.collaborators]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (name.trim().toLowerCase() === 'general') return;

        setLoading(true);
        try {
            await updateList(list.id, {
                name,
                description,
                icon,
                privacy: 'public'
            });
            if (onUpdate) onUpdate({ ...list, name, description, icon, privacy: 'public' });
            onClose();
        } catch (error) {
            console.error('Error updating list', error);
        }
        setLoading(false);
    };

    const handleSearch = async (val) => {
        setSearchTerm(val);
        if (val.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const term = val.toLowerCase().trim();
            const q = query(
                collection(db, 'userProfiles'),
                where('username', '>=', term),
                where('username', '<=', term + '\uf8ff'),
                limit(5)
            );
            const snap = await getDocs(q);
            setSearchResults(snap.docs
                .map(d => ({ uid: d.id, ...d.data() }))
                .filter(u => u.uid !== user?.uid && !list.collaborators?.includes(u.uid))
            );
        } catch (e) {
            console.error(e);
        }
        setIsSearching(false);
    };

    const handleAddCollab = async (targetUser) => {
        try {
            await addCollaborator(list.id, targetUser.uid);
            setSearchResults(prev => prev.filter(u => u.uid !== targetUser.uid));
            toast.success(`Añadido ${targetUser.displayName}`);
        } catch (e) {
            toast.error("Error al añadir colaborador");
        }
    };

    const POPULAR_EMOJIS = ['🎬', '🍿', '🔥', '❤️', '🌟', '👀', '🎭', '😱', '🤖', '🩸', '🌈', '🍕', '📺', '📼', '💎', '💀'];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-[30px]">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-7xl h-[calc(100vh-60px)] bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Ajustes de Lista</h3>
                                <div className="h-1 w-8 bg-primary rounded-full mt-1 opacity-50" />
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Basic Info */}
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Icono</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center justify-center text-4xl shadow-inner">{icon}</div>
                                            <div className="flex-1 grid grid-cols-8 sm:grid-cols-6 gap-2">
                                                {POPULAR_EMOJIS.map(e => (
                                                    <button key={e} type="button" onClick={() => setIcon(e)} className={cn("w-10 h-10 flex items-center justify-center rounded-xl p-0 transition-all border", icon === e ? "bg-primary/20 border-primary scale-110" : "bg-white/5 border-transparent hover:border-white/20 hover:scale-110")}>{e}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Nombre</label>
                                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-display" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Descripción</label>
                                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 transition-all resize-none h-32" />
                                    </div>
                                </div>

                                {/* Privacy & Collaboration */}
                                <div className="space-y-8">
                                    <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg"><UserPlusIcon className="w-5 h-5 text-primary" /></div>
                                            <h4 className="font-bold text-white">Gestión de Colaboradores</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={e => handleSearch(e.target.value)}
                                                    placeholder="Buscar @usuario para invitar..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/30"
                                                />
                                            </div>

                                            <AnimatePresence>
                                                {searchResults.length > 0 && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 max-h-48 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white/[0.02] rounded-xl p-2 border border-white/5">
                                                        {searchResults.map(u => (
                                                            <div key={u.uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <img src={u.photoURL || "/logo.png"} className="w-8 h-8 rounded-full object-cover" alt="" />
                                                                    <div className="truncate text-xs font-bold px-1">{u.displayName}</div>
                                                                </div>
                                                                <button onClick={() => handleAddCollab(u)} className="p-1.5 bg-primary/20 text-primary rounded-lg">
                                                                    <PlusIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="space-y-3 pt-4">
                                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">{user.displayName?.[0]}</div>
                                                        <div>
                                                            <p className="text-xs font-bold text-white">{user.displayName} (Tú)</p>
                                                            <p className="text-[9px] text-primary uppercase font-bold tracking-widest opacity-50">Propietario</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {collaboratorsProfiles.map(u => (
                                                    <div key={u.uid} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/5 group/collab">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <img src={u.photoURL || "/logo.png"} className="w-8 h-8 rounded-full object-cover" alt="" />
                                                            <div className="truncate">
                                                                <p className="text-xs font-bold text-white truncate">{u.displayName}</p>
                                                                <p className="text-[9px] text-gray-500 font-mono italic">@{u.username}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm(`¿Quitar a ${u.displayName}?`)) {
                                                                    await removeCollaborator(list.id, u.uid);
                                                                }
                                                            }}
                                                            className="p-1.5 bg-red-500/10 text-red-500/40 hover:bg-red-500 hover:text-white rounded-lg opacity-0 group-hover/collab:opacity-100 transition-all"
                                                        >
                                                            <XMarkIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex gap-4">
                            <button onClick={onClose} className="flex-1 py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all">Cancelar</button>
                            <button onClick={handleSubmit} disabled={loading} className="flex-[2] py-4 rounded-2xl bg-primary text-black font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ListSettingsModal;
