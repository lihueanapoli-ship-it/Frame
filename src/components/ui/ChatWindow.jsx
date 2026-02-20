import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { db } from '../../api/firebase';
import {
    collection, query, orderBy, onSnapshot, limit
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useChat, getChatId } from '../../contexts/ChatContext';
import { cn } from '../../lib/utils';

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg, isOwn }) => {
    const base = "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm";

    if (msg.type === 'movie_share') {
        return (
            <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                <div className={cn(
                    "rounded-2xl overflow-hidden border max-w-[240px] shadow-lg",
                    isOwn ? "border-primary/30 bg-primary/10" : "border-white/10 bg-surface-elevated"
                )}>
                    {msg.movie?.poster_path && (
                        <img
                            src={`https://image.tmdb.org/t/p/w300${msg.movie.poster_path}`}
                            alt={msg.movie.title}
                            className="w-full h-32 object-cover opacity-90"
                        />
                    )}
                    <div className="p-3">
                        <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1">🎬 Recomendación</p>
                        <p className="font-bold text-white text-sm leading-tight">{msg.movie?.title}</p>
                        {msg.movie?.release_date && (
                            <p className="text-[10px] text-gray-500 mt-0.5">{msg.movie.release_date.split('-')[0]}</p>
                        )}
                        {msg.text && <p className="text-xs text-gray-400 mt-2 border-t border-white/5 pt-2">{msg.text}</p>}
                    </div>
                </div>
            </div>
        );
    }

    if (msg.type === 'list_share') {
        return (
            <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                <div className={cn(
                    "rounded-2xl overflow-hidden border max-w-[240px] shadow-lg",
                    isOwn ? "border-primary/30 bg-primary/10" : "border-white/10 bg-surface-elevated"
                )}>
                    <div className="p-4">
                        <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1">📋 Lista compartida</p>
                        <p className="font-bold text-white text-sm">{msg.list?.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{msg.list?.movieCount || 0} películas</p>
                        {msg.text && <p className="text-xs text-gray-400 mt-2 border-t border-white/5 pt-2">{msg.text}</p>}
                    </div>
                </div>
            </div>
        );
    }

    // Plain text
    return (
        <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
            <div className={cn(
                base,
                isOwn
                    ? "bg-primary text-black rounded-br-sm"
                    : "bg-surface-elevated text-white border border-white/5 rounded-bl-sm"
            )}>
                {msg.text}
            </div>
        </div>
    );
};

// ─── Chat Window ──────────────────────────────────────────────────────────────
const ChatWindow = () => {
    const { openChat, closeChat, sendMessage, markAsRead } = useChat();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    const chatId = openChat && user ? getChatId(user.uid, openChat.uid) : null;

    // Listen to messages
    useEffect(() => {
        if (!chatId) { setMessages([]); return; }

        const q = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(100)
        );
        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        markAsRead(openChat.uid);
        return () => unsub();
    }, [chatId, openChat, markAsRead]);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Mark as read when window opens
    useEffect(() => {
        if (openChat) {
            setIsMinimized(false);
            markAsRead(openChat.uid);
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [openChat, markAsRead]);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed || !openChat) return;
        setText('');
        await sendMessage(openChat.uid, { type: 'text', text: trimmed });
    };

    if (!openChat) return null;

    return createPortal(
        <motion.div
            key="chat-window"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[200] w-[340px] shadow-2xl rounded-2xl overflow-hidden border border-white/10 flex flex-col"
            style={{ maxHeight: isMinimized ? '56px' : '480px', transition: 'max-height 0.3s ease' }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#151515] border-b border-white/10 cursor-pointer select-none"
                onClick={() => setIsMinimized(m => !m)}>
                <img
                    src={openChat.photoURL || '/logo.png'}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-white/10"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{openChat.displayName}</p>
                    <p className="text-[10px] text-gray-500 font-mono">En línea</p>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(m => !m); }}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400"
                    >
                        <ChevronDownIcon className={cn("w-4 h-4 transition-transform", isMinimized ? "rotate-180" : "")} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); closeChat(); }}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0F0F0F]" style={{ minHeight: '300px', maxHeight: '360px' }}>
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8 opacity-50">
                                <p className="text-xs text-gray-500 font-mono">Inicio de conversación</p>
                                <p className="text-xs text-gray-600 mt-1">Recomendá una película 🎬</p>
                            </div>
                        ) : (
                            messages.map(msg => (
                                <MessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    isOwn={msg.senderId === user?.uid}
                                />
                            ))
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="flex items-center gap-2 px-3 py-3 bg-[#151515] border-t border-white/5">
                        <input
                            ref={inputRef}
                            type="text"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder="Escribí un mensaje..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!text.trim()}
                            className="p-2.5 bg-primary text-black rounded-xl hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex-shrink-0"
                        >
                            <PaperAirplaneIcon className="w-4 h-4" />
                        </button>
                    </div>
                </>
            )}
        </motion.div>,
        document.body
    );
};

export default ChatWindow;
