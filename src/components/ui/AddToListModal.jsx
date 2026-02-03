import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon, LockClosedIcon, GlobeAltIcon, UserGroupIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useLists } from '../../contexts/ListContext';
import { cn } from '../../lib/utils';
import { useSound } from '../../contexts/SoundContext';

const AddToListModal = ({ isOpen, onClose, movie }) => {
    const { myLists, createList, addMovieToList, removeMovieFromList, loading } = useLists();
    const { playClick, playSuccess } = useSound();

    const [isCreating, setIsCreating] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListPrivacy, setNewListPrivacy] = useState('public');

    // Filter lists where movie is already present vs not
    const isMovieInList = (list) => list.movies?.some(m => m.id === movie.id);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newListName.trim()) return;

        playClick();
        const newListId = await createList(newListName, '', newListPrivacy);

        // Auto add current movie to new list
        if (movie && newListId) {
            await addMovieToList(newListId, movie);
            playSuccess();
        }

        setIsCreating(false);
        setNewListName('');
    };

    const toggleList = async (list) => {
        playClick();
        if (isMovieInList(list)) {
            await removeMovieFromList(list.id, movie.id);
        } else {
            await addMovieToList(list.id, movie);
            playSuccess();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-surface-elevated">
                    <h3 className="text-white font-bold font-display">Guardar en lista</h3>
                    <button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-400 hover:text-white" /></button>
                </div>

                {/* Content */}
                <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* List Items */}
                    {myLists.length === 0 && !isCreating && (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">No tienes listas personalizadas aún.</p>
                        </div>
                    )}

                    <div className="space-y-1">
                        {myLists.map(list => {
                            const active = isMovieInList(list);
                            return (
                                <button
                                    key={list.id}
                                    onClick={() => toggleList(list)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 group transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-md flex items-center justify-center border transition-all",
                                            active ? "bg-primary border-primary text-black shadow-[0_0_10px_rgba(0,240,255,0.3)]" : "bg-white/5 border-white/10 text-gray-500"
                                        )}>
                                            {active ? <CheckIcon className="w-6 h-6" /> : <PlusIcon className="w-5 h-5" />}
                                        </div>
                                        <div className="text-left">
                                            <p className={cn("text-sm font-semibold transition-colors", active ? "text-primary" : "text-white")}>{list.name}</p>
                                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                {list.movieCount || 0} películas •
                                                {list.privacy === 'private' ? <LockClosedIcon className="w-3 h-3" /> :
                                                    list.privacy === 'friends' ? <UserGroupIcon className="w-3 h-3" /> :
                                                        <GlobeAltIcon className="w-3 h-3" />}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Create New List Form */}
                <div className="p-4 border-t border-white/5 bg-surface-elevated">
                    {!isCreating ? (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all"
                        >
                            <PlusIcon className="w-4 h-4" /> Nueva Lista
                        </button>
                    ) : (
                        <form onSubmit={handleCreate} className="animate-fade-in space-y-3">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Nombre de la lista..."
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <select
                                    value={newListPrivacy}
                                    onChange={(e) => setNewListPrivacy(e.target.value)}
                                    className="bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-gray-400 focus:text-white outline-none"
                                >
                                    <option value="public">Pública</option>
                                    <option value="private">Privada</option>
                                    <option value="friends">Amigos</option>
                                </select>
                                <button
                                    type="submit"
                                    disabled={!newListName.trim()}
                                    className="flex-1 bg-primary text-black font-bold rounded-lg text-xs hover:opacity-90 disabled:opacity-50"
                                >
                                    Crear
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-3 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default AddToListModal;
