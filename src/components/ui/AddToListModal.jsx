import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon, LockClosedIcon, GlobeAltIcon, UserGroupIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useLists } from '../../contexts/ListContext';
import { cn } from '../../lib/utils';
import { useSound } from '../../contexts/SoundContext';
import { useAuth } from '../../contexts/AuthContext';

const AddToListModal = ({ isOpen, onClose, movie }) => {
    const { allLists, addMovieToList, removeMovieFromList } = useLists();
    const { user } = useAuth();
    const { playClick, playSuccess } = useSound();

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
                                <h3 className="text-xl font-bold text-white tracking-tight">Guardar en lista</h3>
                                <div className="h-1 w-8 bg-primary rounded-full mt-1 opacity-50" />
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {allLists.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                                    <p className="text-gray-400 mb-4">No tienes listas personalizadas aún.</p>
                                    <a href="/library" className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">Crear primera lista</a>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {allLists.map(list => {
                                        const active = isMovieInList(list);
                                        const isOwner = list.ownerId === user?.uid;

                                        return (
                                            <button
                                                key={list.id}
                                                onClick={() => toggleList(list)}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                                                    active
                                                        ? "bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(0,240,255,0.1)]"
                                                        : "bg-white/[0.03] border-white/5 hover:border-white/20"
                                                )}
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center border transition-all shrink-0",
                                                        active ? "bg-primary text-black" : "bg-white/5 border-white/10 text-gray-500"
                                                    )}>
                                                        {active ? <CheckIcon className="w-6 h-6" /> : <PlusIcon className="w-6 h-6" />}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className={cn("font-bold transition-colors truncate", active ? "text-primary" : "text-white")}>{list.name}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                                            {list.movieCount || 0} películas
                                                            {!isOwner && <UserGroupIcon className="w-3 h-3 text-blue-400" />}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-center">
                            <a
                                href="/library"
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full text-sm font-bold text-white transition-all active:scale-95"
                            >
                                <PlusIcon className="w-4 h-4" /> Gestionar mis listas
                            </a>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddToListModal;
