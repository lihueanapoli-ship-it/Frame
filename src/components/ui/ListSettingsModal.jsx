import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, TrashIcon, UserPlusIcon, ShieldCheckIcon, GlobeAltIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { db } from '../../api/firebase';
import { doc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const ListSettingsModal = ({ isOpen, onClose, list, onUpdate }) => {
    const { user } = useAuth();
    const [name, setName] = useState(list?.name || '');
    const [description, setDescription] = useState(list?.description || '');
    const [privacy, setPrivacy] = useState(list?.privacy || 'private');
    const [loading, setLoading] = useState(false);

    // Member management
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [members, setMembers] = useState(list?.collaborators_data || []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const listRef = doc(db, 'lists', list.id);
            await updateDoc(listRef, {
                name,
                description,
                privacy,
                updatedAt: new Date()
            });
            onUpdate({ ...list, name, description, privacy });
            onClose();
        } catch (error) {
            console.error('Error updating list', error);
        }
        setLoading(false);
    };

    const searchUsers = async (val) => {
        setSearchQuery(val);
        if (val.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const q = query(
                collection(db, 'users'),
                where('displayName', '>=', val),
                where('displayName', '<=', val + '\uf8ff'),
                limit(5)
            );
            const snap = await getDocs(q);
            setSearchResults(snap.docs
                .map(d => ({ uid: d.id, ...d.data() }))
                .filter(u => u.uid !== user?.uid)
            );
        } catch (e) {
            console.error(e);
        }
        setIsSearching(false);
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
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Nombre</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Descripción</label>
                                        <textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-primary/50 transition-all resize-none h-24"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Privacidad</label>
                                        <div className="flex flex-col gap-2">
                                            {[
                                                { id: 'private', name: 'Privada', icon: LockClosedIcon, desc: 'Solo vos' },
                                                { id: 'friends', name: 'Amigos', icon: UserPlusIcon, desc: 'Tus contactos' },
                                                { id: 'public', name: 'Pública', icon: GlobeAltIcon, desc: 'Toda la comunidad' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setPrivacy(opt.id)}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                                                        privacy === opt.id ? "bg-primary/10 border-primary/50 text-white" : "bg-white/[0.03] border-white/5 text-gray-500"
                                                    )}
                                                >
                                                    <opt.icon className={cn("w-5 h-5", privacy === opt.id ? "text-primary" : "text-gray-600")} />
                                                    <div>
                                                        <p className="font-bold text-sm">{opt.name}</p>
                                                        <p className="text-[10px] opacity-60">{opt.desc}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Members (Placeholder/Future) */}
                                <div className="space-y-6">
                                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <ShieldCheckIcon className="w-5 h-5 text-primary" />
                                            <h4 className="font-bold text-white">Seguridad y Colaboración</h4>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-6">
                                            Próximamente podrás gestionar permisos detallados para tus colaboradores.
                                        </p>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">P</div>
                                                    <span className="text-sm text-white">Propietario</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-primary font-bold uppercase">Dueño</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 py-4 rounded-2xl bg-primary text-black font-bold hover:brightness-110 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                            >
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
