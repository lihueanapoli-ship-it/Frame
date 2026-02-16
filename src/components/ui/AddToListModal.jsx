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
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2 }}
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
                            {allLists.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="text-sm">No tienes listas personalizadas aún.</p>
                                </div>
                            )}

                            <div className="space-y-1">
                                {allLists.map(list => {
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
