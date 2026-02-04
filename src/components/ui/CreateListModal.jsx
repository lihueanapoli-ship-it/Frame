import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { useLists } from '../../contexts/ListContext';
import { useAuth } from '../../contexts/AuthContext';

const CreateListModal = ({ isOpen, onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    // Privacy state removed
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl p-6 z-10"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ListBulletIcon className="w-6 h-6 text-primary" />
                        Nueva Lista
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Favoritas 2024"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                            autoFocus
                        />
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
