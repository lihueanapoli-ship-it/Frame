import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, TrashIcon, UserPlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { db } from '../../api/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useLists } from '../../contexts/ListContext';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ListSettingsModal = ({ isOpen, onClose, list }) => {
    const { user } = useAuth();
    const { addCollaborator, removeCollaborator, updateList } = useLists();

    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Edit fields
    const [name, setName] = useState(list?.name || '');
    const [description, setDescription] = useState(list?.description || '');
    const [icon, setIcon] = useState(list?.icon || '🎬');
    const [isSaving, setIsSaving] = useState(false);

    const isOwner = user?.uid === list?.ownerId;

    useEffect(() => {
        if (isOpen && list) {
            setName(list.name || '');
            setDescription(list.description || '');
            setIcon(list.icon || '🎬');
            fetchMembers();
        }
    }, [isOpen, list]);

    const handleSaveInfo = async () => {
        if (!isOwner || !name.trim()) return;
        setIsSaving(true);
        try {
            await updateList(list.id, {
                name: name.trim(),
                description: description.trim(),
                icon: icon.trim()
            });
            toast.success("Lista actualizada");
        } catch (e) {
            toast.error("Error al actualizar la lista");
        } finally {
            setIsSaving(false);
        }
    };

    const fetchMembers = async () => {
        setLoadingMembers(true);
        try {
            const memberIds = [list.ownerId, ...(list.collaborators || [])];
            const uniqueIds = [...new Set(memberIds)];
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

    // ... (rest of search and action logic stays same, but I need to include it in the replacement)
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (searchQuery.trim().length > 1) {
                setIsSearching(true);
                try {
                    const term = searchQuery.toLowerCase().trim();
                    const q = query(collection(db, 'users'), where('searchName', '>=', term), where('searchName', '<=', term + '\uf8ff'), limit(5));
                    const snap = await getDocs(q);
                    const found = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
                    const existingIds = new Set(members.map(m => m.uid));
                    setSearchResults(found.filter(u => !existingIds.has(u.uid)));
                } catch (e) { console.error(e); } finally { setIsSearching(false); }
            } else { setSearchResults([]); }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, members]);

    const handleAdd = async (targetUser) => {
        try {
            await addCollaborator(list.id, targetUser.uid);
            setMembers(prev => [...prev, targetUser]);
            setSearchResults(prev => prev.filter(u => u.uid !== targetUser.uid));
            setSearchQuery('');
        } catch (e) { toast.error("Error al añadir miembro"); }
    };

    const handleRemove = async (memberUid) => {
        if (!confirm("¿Eliminar a este usuario de la lista?")) return;
        try {
            await removeCollaborator(list.id, memberUid);
            setMembers(prev => prev.filter(m => m.uid !== memberUid));
        } catch (e) { toast.error("Error al eliminar miembro"); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-[calc(100%-2rem)] sm:w-full max-w-7xl bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[92vh] sm:h-[94vh] my-auto" >
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 bg-surface-elevated flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-white">Configuración de la Lista</h2>
                                <p className="text-xs text-gray-400">Personaliza y gestiona tu colección</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"> <XMarkIcon className="w-5 h-5" /> </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                            {/* 1. Basic Info (Owner Only) */}
                            {isOwner && (
                                <section className="space-y-4">
                                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Información Básica</h3>
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-3xl shrink-0">
                                            <input
                                                type="text"
                                                value={icon}
                                                onChange={(e) => setIcon(e.target.value.substring(0, 2))}
                                                className="bg-transparent w-full text-center focus:outline-none"
                                                title="Icono/Emoji"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Nombre de la lista"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                            />
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Descripción corta..."
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none h-20"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSaveInfo}
                                        disabled={isSaving || !name.trim() || (name === list.name && description === list.description && icon === list.icon)}
                                        className="w-full py-2.5 bg-white text-black rounded-xl font-bold text-sm hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                    >
                                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </section>
                            )}

                            {/* 2. Members List */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Miembros ({members.length})</h3>
                                    {isOwner && <span className="text-[10px] text-gray-500 font-mono">Los colaboradores pueden añadir/quitar pelis</span>}
                                </div>

                                {loadingMembers ? (
                                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {members.map(member => (
                                            <div key={member.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-white/10 relative">
                                                        {member.photoURL ? <img src={member.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{member.displayName?.[0]}</div>}
                                                        {member.uid === list.ownerId && <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[8px] px-1 rounded-full font-bold border border-black">DUEÑO</div>}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{member.uid === user.uid ? `${member.displayName} (Tú)` : member.displayName}</p>
                                                        <p className="text-[10px] text-gray-500">{member.username ? `@${member.username}` : member.email}</p>
                                                    </div>
                                                </div>
                                                {member.uid !== list.ownerId && isOwner && (
                                                    <button onClick={() => handleRemove(member.uid)} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"> <TrashIcon className="w-4 h-4" /> </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* 3. Add Members (Only Owner) */}
                            {isOwner && (
                                <section className="pt-4 border-t border-white/5">
                                    <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-2 font-mono">
                                        <UserPlusIcon className="w-4 h-4" /> RECLUTAR COLABORADORES
                                    </h3>
                                    <div className="relative">
                                        <input type="text" placeholder="Buscar por nombre o usuario..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-gray-600" />
                                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
                                    </div>

                                    <AnimatePresence>
                                        {searchResults.length > 0 && (
                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-2 bg-surface-elevated border border-white/10 rounded-xl overflow-hidden shadow-xl" >
                                                {searchResults.map(res => (
                                                    <button key={res.uid} onClick={() => handleAdd(res)} className="w-full flex items-center gap-3 p-3 hover:bg-primary/20 transition-all text-left" >
                                                        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden"> {res.photoURL ? <img src={res.photoURL} className="w-full h-full object-cover" /> : null} </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{res.displayName}</p>
                                                            <p className="text-[10px] text-gray-400">@{res.username || 'sin-usuario'}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </section>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ListSettingsModal;
