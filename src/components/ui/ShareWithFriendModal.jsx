import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { db } from '../../api/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { cn } from '../../lib/utils';

/**
 * Modal to share a movie or list with a friend via chat.
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   type: 'movie' | 'list'
 *   payload: movie object | list object
 */
const ShareWithFriendModal = ({ isOpen, onClose, type, payload }) => {
    const { user } = useAuth();
    const { sendMessage, openChatWith } = useChat();
    const [friends, setFriends] = useState([]);
    const [search, setSearch] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(null); // uid of friend sent to
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !user) return;
        setSent(null);
        setSearch('');
        setMessage('');
        loadFriends();
    }, [isOpen, user]);

    const loadFriends = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'users', user.uid, 'friends'));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
            setFriends(list);
        } catch (e) {
            console.error('Error loading friends', e);
        }
        setLoading(false);
    };

    const handleSend = async (friend) => {
        if (!payload) return;

        // Sanitize payload to only include plain, serializable fields
        // (TMDB movies have 20+ extra fields; Firestore lists have Timestamp objects)
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
            movieCount: Array.isArray(payload.movies)
                ? payload.movies.length
                : (payload.movieCount ?? 0),
        } : null;

        const content = type === 'movie'
            ? { type: 'movie_share', movie: sanitizedMovie, text: message.trim() || '' }
            : { type: 'list_share', list: sanitizedList, text: message.trim() || '' };

        await sendMessage(friend.uid, content);
        setSent(friend.uid);

        // Open chat window with that friend after a brief moment
        setTimeout(() => {
            openChatWith(friend);
            onClose();
        }, 1200);
    };

    const filtered = friends.filter(f =>
        (f.displayName || '').toLowerCase().includes(search.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={e => e.stopPropagation()}
                        className="relative z-10 w-[calc(100%-2rem)] max-w-sm bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <div>
                                <h3 className="font-bold text-white text-base">
                                    {type === 'movie' ? '🎬 Recomendar película' : '📋 Compartir lista'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">
                                    {type === 'movie' ? payload?.title : payload?.name}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <XMarkIcon className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Message */}
                        <div className="px-5 pt-4">
                            <input
                                type="text"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Agregar un comentario... (opcional)"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30"
                            />
                        </div>

                        {/* Search friends */}
                        {friends.length > 4 && (
                            <div className="px-5 pt-3">
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Buscar amigo..."
                                        className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Friends list */}
                        <div className="px-5 py-4 max-h-64 overflow-y-auto space-y-1">
                            {loading ? (
                                <div className="flex justify-center py-6">
                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : filtered.length === 0 ? (
                                <p className="text-center text-sm text-gray-500 py-6">
                                    {friends.length === 0 ? 'Aún no tenés amigos agregados.' : 'No se encontró ningún amigo.'}
                                </p>
                            ) : (
                                filtered.map(friend => (
                                    <button
                                        key={friend.uid}
                                        onClick={() => handleSend(friend)}
                                        disabled={sent === friend.uid}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                                            sent === friend.uid
                                                ? "bg-primary/20 border border-primary/30"
                                                : "hover:bg-white/5 border border-transparent"
                                        )}
                                    >
                                        <img
                                            src={friend.photoURL || '/logo.png'}
                                            alt=""
                                            className="w-9 h-9 rounded-full object-cover border border-white/10 flex-shrink-0"
                                        />
                                        <span className="flex-1 text-sm font-medium text-white truncate">
                                            {friend.displayName || friend.email}
                                        </span>
                                        {sent === friend.uid ? (
                                            <span className="text-xs text-primary font-bold">¡Enviado!</span>
                                        ) : (
                                            <PaperAirplaneIcon className="w-4 h-4 text-gray-500 group-hover:text-primary" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ShareWithFriendModal;
