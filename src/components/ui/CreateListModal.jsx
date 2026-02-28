import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { useLists } from '../../contexts/ListContext';
import { useAuth } from '../../contexts/AuthContext';

const CreateListModal = ({ isOpen, onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('🎬');
    const { createList } = useLists();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            const newListId = await createList({
                name,
                description,
                icon,
                privacy: 'public', // Always public now
                ownerId: user.uid,
                ownerName: user.displayName,
                movies: [],
                createdAt: new Date().toISOString()
            });
            onCreated(newListId);
            onClose();
            setName('');
            setDescription('');
            setIcon('🎬');
        } catch (error) {
            console.error("Error creating list:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-[calc(100%-2rem)] max-w-md bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-2xl p-6 md:p-8 z-10 overflow-hidden max-h-[90vh]"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ListBulletIcon className="w-6 h-6 text-primary" />
                        Nueva Lista
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                            <input
                                type="text"
                                name="listName"
                                id="list-name-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Favoritas 2024"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="¿De qué trata esta lista?"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary h-24 resize-none"
                        />
                    </div>
                    {/* Privacy Selector Removed - Simplification */}

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="w-full py-3.5 bg-primary text-black rounded-xl font-bold shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-all"
                    >
                        {loading ? 'Creando...' : 'Crear Lista'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default CreateListModal;
