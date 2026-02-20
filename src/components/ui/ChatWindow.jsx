import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon, PaperAirplaneIcon, ChevronDownIcon,
    FilmIcon, ListBulletIcon, TrashIcon, EyeIcon
} from '@heroicons/react/24/outline';
import { db } from '../../api/firebase';
import { collection, query, orderBy, onSnapshot, limit, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useChat, getChatId } from '../../contexts/ChatContext';
import { cn } from '../../lib/utils';

// ─── Format timestamp ──────────────────────────────────────────────────────────
const formatMsgTime = (ts) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

// ─── Movie Share Bubble ────────────────────────────────────────────────────────
const MovieBubble = ({ msg, isOwn, onOpenMovie }) => (
    <div className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
        <button
            onClick={() => onOpenMovie(msg.movie)}
            className={cn(
                "rounded-2xl overflow-hidden max-w-[210px] shadow-xl border text-left group transition-transform active:scale-[0.98]",
                isOwn ? "border-primary/40 bg-primary/10" : "border-white/10 bg-[#1e1e1e]"
            )}
        >
            {msg.movie?.poster_path ? (
                <div className="relative">
                    <img
                        src={`https://image.tmdb.org/t/p/w300${msg.movie.poster_path}`}
                        alt={msg.movie.title}
                        className="w-full h-28 object-cover group-hover:brightness-75 transition-all"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5">
                            <EyeIcon className="w-3.5 h-3.5 text-white" />
                            <span className="text-[10px] text-white font-bold">Ver detalles</span>
                        </div>
                    </div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1">
                        <FilmIcon className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-mono text-primary uppercase tracking-widest font-bold">Recomendación</span>
                    </div>
                </div>
            ) : (
                <div className="h-16 bg-white/5 flex items-center justify-center">
                    <FilmIcon className="w-8 h-8 text-gray-600" />
                </div>
            )}
            <div className="p-3">
                <p className="font-bold text-white text-sm leading-tight">{msg.movie?.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    {msg.movie?.vote_average > 0 && (
                        <span className="text-[10px] text-yellow-400 font-mono">⭐ {Number(msg.movie.vote_average).toFixed(1)}</span>
                    )}
                    {msg.movie?.release_date && (
                        <span className="text-[10px] text-gray-500 font-mono">{msg.movie.release_date.split('-')[0]}</span>
                    )}
                </div>
                {msg.text && (
                    <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-white/5 italic">"{msg.text}"</p>
                )}
            </div>
        </button>
        <span className="text-[9px] text-gray-600 font-mono px-1">{formatMsgTime(msg.createdAt)}</span>
    </div>
);

// ─── List Share Bubble ──────────────────────────────────────────────────────────
const ListBubble = ({ msg, isOwn }) => (
    <div className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
        <div className={cn(
            "rounded-2xl overflow-hidden max-w-[210px] shadow-xl border",
            isOwn ? "border-primary/40 bg-primary/10" : "border-white/10 bg-[#1e1e1e]"
        )}>
            <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                        <ListBulletIcon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[9px] font-mono text-primary uppercase tracking-widest font-bold">Lista compartida</span>
                </div>
                <p className="font-bold text-white text-sm">{msg.list?.name}</p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {msg.list?.movieCount ?? 0} película{msg.list?.movieCount !== 1 ? 's' : ''}
                </p>
                {msg.text && (
                    <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-white/5 italic">"{msg.text}"</p>
                )}
            </div>
        </div>
        <span className="text-[9px] text-gray-600 font-mono px-1">{formatMsgTime(msg.createdAt)}</span>
    </div>
);

// ─── Text Bubble ───────────────────────────────────────────────────────────────
const TextBubble = ({ msg, isOwn }) => (
    <div className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
        <div className={cn(
            "max-w-[75%] px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            isOwn
                ? "bg-primary text-black rounded-2xl rounded-br-sm font-medium"
                : "bg-[#1e1e1e] text-white border border-white/5 rounded-2xl rounded-bl-sm"
        )}>
            {msg.text}
        </div>
        <span className="text-[9px] text-gray-600 font-mono px-1">{formatMsgTime(msg.createdAt)}</span>
    </div>
);

// ─── Message Bubble wrapper with delete ───────────────────────────────────────
const MessageBubble = ({ msg, isOwn, chatId, onOpenMovie }) => {
    const [showDelete, setShowDelete] = useState(false);
    const longPressTimer = useRef(null);

    const handleDelete = async (e) => {
        e.stopPropagation();
        try {
            await deleteDoc(doc(db, 'chats', chatId, 'messages', msg.id));
        } catch (err) {
            console.error('Error deleting message:', err);
        }
        setShowDelete(false);
    };

    // Long press for mobile
    const handleTouchStart = () => {
        longPressTimer.current = setTimeout(() => setShowDelete(true), 500);
    };
    const handleTouchEnd = () => {
        clearTimeout(longPressTimer.current);
    };

    return (
        <div
            className={cn("group relative flex", isOwn ? "justify-end" : "justify-start")}
            onMouseEnter={() => setShowDelete(true)}
            onMouseLeave={() => setShowDelete(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Delete button — appears on hover (desktop) or long-press (mobile) */}
            <AnimatePresence>
                {showDelete && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.12 }}
                        onClick={handleDelete}
                        className={cn(
                            "self-center flex-shrink-0 p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 transition-colors",
                            isOwn ? "order-first mr-2" : "order-last ml-2"
                        )}
                        title="Borrar mensaje"
                    >
                        <TrashIcon className="w-3 h-3" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* The actual bubble */}
            <div>
                {msg.type === 'movie_share' ? (
                    <MovieBubble msg={msg} isOwn={isOwn} onOpenMovie={onOpenMovie} />
                ) : msg.type === 'list_share' ? (
                    <ListBubble msg={msg} isOwn={isOwn} />
                ) : (
                    <TextBubble msg={msg} isOwn={isOwn} />
                )}
            </div>
        </div>
    );
};

// ─── Chat Window ──────────────────────────────────────────────────────────────
const ChatWindow = () => {
    const { openChat, closeChat, sendMessage, markAsRead, openMovieDetail } = useChat();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    const chatId = openChat && user ? getChatId(user.uid, openChat.uid) : null;

    // Subscribe to messages
    useEffect(() => {
        if (!chatId) { setMessages([]); return; }
        const q = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(150)
        );
        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [chatId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0 && !isMinimized) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, isMinimized]);

    // On open: unminimize, mark as read, focus input
    useEffect(() => {
        if (!openChat) return;
        setIsMinimized(false);
        markAsRead(openChat.uid);
        setTimeout(() => inputRef.current?.focus(), 350);
    }, [openChat?.uid]);

    // Mark as read while window is open and new messages arrive
    useEffect(() => {
        if (openChat && messages.length > 0 && !isMinimized) {
            markAsRead(openChat.uid);
        }
    }, [messages.length, isMinimized, openChat?.uid]);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed || !openChat || sending) return;
        setSending(true);
        setText('');
        try {
            await sendMessage(openChat.uid, { type: 'text', text: trimmed });
        } catch (_) {
            setText(trimmed); // restore on error
        } finally {
            setSending(false);
        }
        inputRef.current?.focus();
    };

    // Open movie detail from chat
    const handleOpenMovie = useCallback((movie) => {
        if (movie?.id) openMovieDetail(movie);
    }, [openMovieDetail]);

    return createPortal(
        <AnimatePresence>
            {openChat && (
                <motion.div
                    key={`chat-${openChat.uid}`}
                    initial={{ y: 80, opacity: 0, scale: 0.97 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 80, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 360 }}
                    className="fixed bottom-[88px] md:bottom-6 right-4 md:right-6 z-[200] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.7)] flex flex-col bg-[#0F0F0F]"
                    style={{
                        maxHeight: isMinimized ? '58px' : '500px',
                        transition: 'max-height 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center gap-3 px-4 py-3 bg-[#151515] border-b border-white/[0.06] cursor-pointer select-none shrink-0"
                        onClick={() => setIsMinimized(m => !m)}
                    >
                        <div className="relative">
                            <img
                                src={openChat.photoURL || '/logo.png'}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-white/10"
                            />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#151515]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate leading-tight">{openChat.displayName}</p>
                            <p className="text-[10px] text-green-400 font-mono">● Chat activo</p>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setIsMinimized(m => !m)}
                                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white"
                            >
                                <ChevronDownIcon className={cn("w-4 h-4 transition-transform duration-300", isMinimized ? "rotate-180" : "")} />
                            </button>
                            <button
                                onClick={closeChat}
                                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        className="flex-1 overflow-y-auto py-4 px-3 space-y-3 custom-scrollbar"
                        style={{ maxHeight: '390px' }}
                    >
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-12 opacity-50">
                                <span className="text-3xl mb-2">🎬</span>
                                <p className="text-xs text-gray-500 font-mono">Sin mensajes aún</p>
                                <p className="text-[10px] text-gray-600 mt-1">¡Recomendá una película!</p>
                            </div>
                        ) : (
                            messages.map(msg => (
                                <MessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    isOwn={msg.senderId === user?.uid}
                                    chatId={chatId}
                                    onOpenMovie={handleOpenMovie}
                                />
                            ))
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    {!isMinimized && (
                        <div className="flex items-center gap-2 px-3 py-3 bg-[#151515] border-t border-white/[0.06] shrink-0">
                            <input
                                ref={inputRef}
                                type="text"
                                value={text}
                                onChange={e => setText(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Escribí un mensaje..."
                                maxLength={500}
                                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!text.trim() || sending}
                                className={cn(
                                    "p-2.5 rounded-xl flex-shrink-0 transition-all active:scale-95",
                                    text.trim() && !sending
                                        ? "bg-primary text-black hover:opacity-90 shadow-lg shadow-primary/20"
                                        : "bg-white/5 text-gray-600 cursor-not-allowed"
                                )}
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ChatWindow;
