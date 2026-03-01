import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
    XMarkIcon, PaperAirplaneIcon,
    ChatBubbleLeftRightIcon, TrashIcon, StarIcon
} from '@heroicons/react/24/outline';
import { useChat, getChatId } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../api/firebase';
import {
    collection, query, orderBy, onSnapshot, limit,
    deleteDoc, doc
} from 'firebase/firestore';
import { cn } from '../../lib/utils';

/* ── helpers ─────────────────────────────────────────── */
const formatTime = (seconds) => {
    if (!seconds) return '';
    return new Date(seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/* ── Movie bubble (clickable for both users) ─────────── */
const MovieBubble = ({ movie, text, isMe, onOpenMovie }) => (
    <div className="space-y-2">
        <button
            onClick={() => onOpenMovie(movie)}
            className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] text-left',
                isMe
                    ? 'bg-black/20 border-black/20 hover:bg-black/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
            )}
        >
            {movie?.poster_path ? (
                <img
                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                    className="w-11 h-[66px] rounded-xl object-cover shadow-lg flex-shrink-0"
                    alt={movie.title}
                />
            ) : (
                <div className="w-11 h-[66px] rounded-xl bg-white/10 flex-shrink-0" />
            )}
            <div className="min-w-0">
                <p className={cn('font-bold text-xs truncate uppercase tracking-wide', isMe ? 'text-black' : 'text-white')}>
                    {movie?.title}
                </p>
                {movie?.vote_average > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                        <StarIcon className={cn('w-3 h-3', isMe ? 'text-black/60' : 'text-primary')} />
                        <span className={cn('text-[10px] font-mono', isMe ? 'text-black/60' : 'text-gray-400')}>
                            {movie.vote_average?.toFixed(1)}
                        </span>
                    </div>
                )}
                <p className={cn('text-[9px] mt-1 flex items-center gap-1', isMe ? 'text-black/50' : 'text-gray-500')}>
                    🎬 <span className="underline underline-offset-2">Ver detalles</span>
                </p>
            </div>
        </button>
        {text && <p className="text-sm leading-relaxed">{text}</p>}
    </div>
);

/* ── List bubble ─────────────────────────────────────── */
const ListBubble = ({ list, text, isMe }) => (
    <div className="space-y-2">
        <div className={cn(
            'flex items-center gap-3 p-3 rounded-2xl border',
            isMe ? 'bg-black/20 border-black/20' : 'bg-white/5 border-white/10'
        )}>
            <div className={cn('p-2 rounded-xl text-lg', isMe ? 'bg-black/20' : 'bg-primary/20')}>📋</div>
            <div className="truncate">
                <p className={cn('font-bold text-xs uppercase truncate', isMe ? 'text-black' : 'text-white')}>{list?.name}</p>
                <p className={cn('text-[9px]', isMe ? 'text-black/50' : 'text-gray-500')}>
                    {list?.movieCount ?? 0} películas · Lista Compartida
                </p>
            </div>
        </div>
        {text && <p className="text-sm leading-relaxed">{text}</p>}
    </div>
);

/* ── Main ChatWindow ─────────────────────────────────── */
const ChatWindow = () => {
    const { openChat, closeChat, sendMessage, markAsRead, openMovieDetail } = useChat();
    const { user } = useAuth();
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [hoveredId, setHoveredId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    const isOpen = !!openChat;

    /* Subscribe to messages */
    useEffect(() => {
        if (!openChat || !user) { setMessages([]); return; }

        const chatId = getChatId(user.uid, openChat.uid);
        const q = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(150)
        );

        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        markAsRead(openChat.uid);
        return () => unsub();
    }, [openChat?.uid, user?.uid]);

    /* Auto-scroll & mark read on new messages */
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        if (isOpen && openChat) markAsRead(openChat.uid);
    }, [messages]);

    /* Focus input when opened */
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    }, [isOpen]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputValue.trim() || !openChat) return;
        sendMessage(openChat.uid, { type: 'text', text: inputValue.trim() });
        setInputValue('');
    };

    const handleDelete = async (msg) => {
        if (!user || msg.senderId !== user.uid) return;
        setDeletingId(msg.id);
        try {
            const chatId = getChatId(user.uid, openChat.uid);
            await deleteDoc(doc(db, 'chats', chatId, 'messages', msg.id));
        } catch (err) {
            console.error('Error deleting message:', err);
        }
        setDeletingId(null);
    };

    const modal = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-[30px]">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={closeChat}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Window */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-xl h-[calc(100vh-60px)] bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
                    >
                        {/* ── Header ── */}
                        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02] flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <img
                                        src={openChat?.photoURL || '/logo.png'}
                                        className="w-9 h-9 rounded-full border border-white/10 object-cover"
                                        alt=""
                                    />
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0F0F0F]" />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{openChat?.displayName}</p>
                                    <p className="text-[10px] text-green-500 font-mono">En línea</p>
                                </div>
                            </div>
                            <button
                                onClick={closeChat}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ── Messages ── */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-4 py-5 space-y-3 custom-scrollbar"
                        >
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-700">
                                    <ChatBubbleLeftRightIcon className="w-10 h-10" />
                                    <p className="text-sm italic">Iniciá una conversación sobre cine...</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.senderId === user?.uid;
                                    const isHovered = hoveredId === msg.id;
                                    const isDeleting = deletingId === msg.id;

                                    return (
                                        <div
                                            key={msg.id}
                                            className={cn('flex gap-2 group', isMe ? 'flex-row-reverse' : 'flex-row')}
                                            onMouseEnter={() => setHoveredId(msg.id)}
                                            onMouseLeave={() => setHoveredId(null)}
                                        >
                                            {/* Avatar (friend only) */}
                                            {!isMe && (
                                                <img
                                                    src={openChat?.photoURL || '/logo.png'}
                                                    className="w-7 h-7 rounded-full object-cover border border-white/10 flex-shrink-0 mt-auto mb-1"
                                                    alt=""
                                                />
                                            )}

                                            {/* Delete button — own messages only */}
                                            {isMe && msg.senderId === user?.uid && (
                                                <div className={cn(
                                                    'flex items-end mb-1 transition-opacity',
                                                    // Always show on mobile, hover-only on desktop
                                                    'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                                                )}>
                                                    <button
                                                        onClick={() => handleDelete(msg)}
                                                        disabled={isDeleting}
                                                        className="p-1.5 rounded-full text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-30"
                                                        title="Borrar mensaje"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Bubble */}
                                            <div className={cn(
                                                'max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-md transition-opacity',
                                                isMe
                                                    ? 'bg-primary text-black rounded-tr-sm'
                                                    : 'bg-white/8 text-white rounded-tl-sm border border-white/8',
                                                isDeleting && 'opacity-40'
                                            )}>
                                                {msg.type === 'movie_share' ? (
                                                    <MovieBubble
                                                        movie={msg.movie}
                                                        text={msg.text}
                                                        isMe={isMe}
                                                        onOpenMovie={(movie) => {
                                                            // Open movie detail ON TOP of chat — don't close chat
                                                            // so when the user closes the movie detail,
                                                            // they return directly to this conversation.
                                                            openMovieDetail(movie);
                                                        }}
                                                    />
                                                ) : msg.type === 'list_share' ? (
                                                    <ListBubble list={msg.list} text={msg.text} isMe={isMe} />
                                                ) : (
                                                    <p className="leading-relaxed break-words">{msg.text}</p>
                                                )}
                                                <span className={cn(
                                                    'text-[9px] mt-1.5 block font-mono',
                                                    isMe ? 'text-black/40 text-right' : 'text-gray-600'
                                                )}>
                                                    {formatTime(msg.createdAt?.seconds)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* ── Input ── */}
                        <form onSubmit={handleSend} className="px-4 py-4 border-t border-white/5 bg-white/[0.01] flex-shrink-0">
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 pr-2 py-2 focus-within:border-primary/40 transition-all">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    placeholder="Escribí un mensaje..."
                                    className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-600 focus:outline-none py-2"
                                />
                                <motion.button
                                    type="submit"
                                    disabled={!inputValue.trim()}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-3 bg-primary text-black rounded-xl hover:brightness-110 transition-all shadow-md shadow-primary/20 disabled:opacity-30 disabled:pointer-events-none flex-shrink-0"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modal, document.body);
};

export default ChatWindow;
