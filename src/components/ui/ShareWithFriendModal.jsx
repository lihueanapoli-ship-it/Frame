import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { db } from '../../api/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { cn } from '../../lib/utils';

const ShareWithFriendModal = ({ isOpen, onClose, type, payload }) => {
    const { user } = useAuth();
    const { sendMessage, openChatWith } = useChat();
    const [friends, setFriends] = useState([]);
    const [search, setSearch] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !user) return;
        setSent(null); setSearch(''); setMessage('');
        loadFriends();
    }, [isOpen, user]);

    const loadFriends = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'users', user.uid, 'friends'));
            const snap = await getDocs(q);
            setFriends(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
        } catch (e) {
            console.error('Error loading friends', e);
        }
        setLoading(false);
    };

    const handleSend = async (friend) => {
        if (!payload) return;
        const sanitizedMovie = payload && type === 'movie' ? {
            id: payload.id ?? null,
            title: payload.title ?? '',
            poster_path: payload.poster_path ?? null,
            release_date: payload.release_date ?? null,
            vote_average: payload.vote_average ?? null,
        } : null;
        const sanitizedList = payload && type === 'list' ? {
            id: payload.id ?? null,
            name: payload.name ?? 'Lista sin nombre',
            movieCount: Array.isArray(payload.movies) ? payload.movies.length : (payload.movieCount ?? 0),
        } : null;

        const content = type === 'movie'
            ? { type: 'movie_share', movie: sanitizedMovie, text: message.trim() || '' }
            : { type: 'list_share', list: sanitizedList, text: message.trim() || '' };

        await sendMessage(friend.uid, content);
        setSent(friend.uid);
        setTimeout(() => { openChatWith(friend); onClose(); }, 1200);
    };

    const filtered = friends.filter(f => (f.displayName || '').toLowerCase().includes(search.toLowerCase()));

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-7xl h-[92vh] sm:h-[94vh] bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
                    >
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">
                                    {type === 'movie' ? 'Recomendar Película' : 'Compartir Lista'}
                                </h3>
                                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest truncate max-w-[200px]">
                                    {type === 'movie' ? payload?.title : payload?.name}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Escribe un comentario</label>
                                <input
                                    type="text"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="¿Por qué lo compartís? (opcional)"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50"
                                />
                            </div>

                            <div className="space-y-4 flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tus Amigos</label>
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                        <MagnifyingGlassIcon className="w-3 h-3 text-gray-500" />
                                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar..." className="bg-transparent text-[10px] text-white focus:outline-none w-24" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {loading ? (
                                        <div className="col-span-full py-20 flex justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                                    ) : filtered.length === 0 ? (
                                        <div className="col-span-full py-20 text-center text-gray-500 italic">No tienes amigos conectados aún.</div>
                                    ) : (
                                        filtered.map(friend => (
                                            <button
                                                key={friend.uid}
                                                onClick={() => handleSend(friend)}
                                                disabled={sent === friend.uid}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                                                    sent === friend.uid ? "bg-primary/10 border-primary/50 text-white" : "bg-white/[0.03] border-white/5 hover:border-white/20"
                                                )}
                                            >
                                                <div className="flex items-center gap-4 truncate">
                                                    <img src={friend.photoURL || '/logo.png'} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="" />
                                                    <span className="font-bold text-sm truncate">{friend.displayName || friend.email}</span>
                                                </div>
                                                {sent === friend.uid ? <CheckIcon className="w-5 h-5 text-primary" /> : <PaperAirplaneIcon className="w-5 h-5 text-gray-500" />}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-center">
                            <button onClick={onClose} className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-full text-sm font-bold text-white transition-all">Cancelar</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ShareWithFriendModal;
