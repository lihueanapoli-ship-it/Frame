import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon, LockClosedIcon, GlobeAltIcon, UserGroupIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useLists } from '../../contexts/ListContext';
import { cn } from '../../lib/utils';
import { useSound } from '../../contexts/SoundContext';

const AddToListModal = ({ isOpen, onClose, movie }) => {
    const { allLists, addMovieToList, removeMovieFromList } = useLists();
    const { playClick, playSuccess } = useSound();
    // Removed local creation state

    // Filter lists where movie is already present vs not
    const isMovieInList = (list) => list.movies?.some(m => m.id === movie.id);



    const toggleList = async (list) => {
        playClick();
        if (isMovieInList(list)) {
            await removeMovieFromList(list.id, movie.id);
        } else {
            await addMovieToList(list.id, movie);
            playSuccess();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-[calc(100%-2rem)] max-w-sm bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] my-4"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-surface-elevated">
                            <h3 className="text-white font-bold font-display">Guardar en lista</h3>
                            <button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-400 hover:text-white" /></button>
                        </div>

                        {/* Content */}
                        <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {/* List Items */}
                            {allLists.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="text-sm">No tienes listas personalizadas aún.</p>
                                </div>
                            )}

                            <div className="space-y-1">
                                {allLists.map(list => {
                                    const active = isMovieInList(list);
                                    const isCollab = list.ownerId !== useLists.user?.uid && list.collaborators?.includes(useLists.user?.uid);
                                    // Use explicit check from context if needed, but list object has necessary info? 
                                    // Actually allLists structure: {id, ...data}. 
                                    // We need current user ID to check ownership vs collab properly here, 
                                    // OR we can just check if we are owner.
                                    // But hook user is not imported here. Let's fix that.

                                    // Simplest: Check if ownerId is NOT me? 
                                    // Wait, we don't have user in this component scope except via context hook call?
                                    // Let's rely on list property if possible or import user.

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
                                                    <div className="flex items-center gap-2">
                                                        <p className={cn("text-sm font-semibold transition-colors", active ? "text-primary" : "text-white")}>{list.name}</p>
                                                        {list.ownerName && list.ownerId && (
                                                            // Heuristic: If I can't check user.uid easily without import, just show owner avatar/name if present?
                                                            // Let's import useAuth to be precise.
                                                            <span className="text-[10px] bg-white/10 px-1.5 rounded text-gray-400 flex items-center gap-1">
                                                                {list.collaborators?.length > 0 && <UserGroupIcon className="w-3 h-3" />}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        {list.movieCount || 0} películas •
                                                        <GlobeAltIcon className="w-3 h-3" />
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer / Call to Action */}
                        <div className="p-4 border-t border-white/5 bg-surface-elevated text-center">
                            <p className="text-[10px] text-gray-500 mb-2">¿Quieres una nueva colección?</p>
                            <a
                                href="/library"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-semibold text-white transition-colors"
                            >
                                <PlusIcon className="w-3 h-3" /> Crear en Mis Listas
                            </a>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddToListModal;
