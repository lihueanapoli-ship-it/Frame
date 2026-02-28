import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon, LockClosedIcon, GlobeAltIcon, UserGroupIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useLists } from '../../contexts/ListContext';
import { cn } from '../../lib/utils';

const CreateListModal = ({ isOpen, onClose }) => {
    const { createList } = useLists();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [privacy, setPrivacy] = useState('private');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            await createList({ name, description, privacy });
            onClose();
        } catch (error) {
            console.error('Error creating list', error);
        }
        setLoading(false);
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
                        transition={{ duration: 0.2 }}
                        className="relative w-full max-w-7xl h-[calc(100vh-60px)] bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Nueva Lista</h3>
                                <div className="h-1 w-8 bg-primary rounded-full mt-1 opacity-50" />
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Nombre de la lista</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ej: Joyas ocultas del 2023"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-lg text-white placeholder-gray-700 focus:outline-none focus:border-primary/50 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Descripción (opcional)</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="¿De qué trata esta colección?"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-700 focus:outline-none focus:border-primary/50 transition-all resize-none h-32"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Privacidad</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPrivacy('private')}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                                            privacy === 'private' ? "bg-primary/10 border-primary/50 text-white" : "bg-white/[0.03] border-white/5 text-gray-500 hover:bg-white/5"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-lg", privacy === 'private' ? "bg-primary text-black" : "bg-white/5")}>
                                            <LockClosedIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">Privada</p>
                                            <p className="text-[10px] opacity-60">Solo vos podés verla</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPrivacy('public')}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                                            privacy === 'public' ? "bg-primary/10 border-primary/50 text-white" : "bg-white/[0.03] border-white/5 text-gray-500 hover:bg-white/5"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-lg", privacy === 'public' ? "bg-primary text-black" : "bg-white/5")}>
                                            <GlobeAltIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">Pública</p>
                                            <p className="text-[10px] opacity-60">Todos pueden verla</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !name.trim()}
                                className="flex-1 py-4 rounded-2xl bg-primary text-black font-bold hover:brightness-110 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                            >
                                {loading ? 'Creando...' : 'Crear Lista'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CreateListModal;
