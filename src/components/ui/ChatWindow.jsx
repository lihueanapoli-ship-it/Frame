import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, ChevronLeftIcon, UsersIcon, EllipsisVerticalIcon, PhoneIcon, VideoCameraIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

const ChatWindow = () => {
    const { isOpen, activeChat, closeChat, messages, sendMessage, markAsRead } = useChat();
    const { user } = useAuth();
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        if (isOpen && activeChat) {
            markAsRead(activeChat.uid);
        }
    }, [messages, isOpen, activeChat]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputValue.trim() || !activeChat) return;
        sendMessage(activeChat.uid, { type: 'text', text: inputValue.trim() });
        setInputValue('');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeChat} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-[calc(100%-2rem)] sm:w-full max-w-7xl bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden h-[92vh] sm:h-[94vh] my-auto flex flex-col"
                >
                    {/* Chat Header */}
                    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                            <button onClick={closeChat} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeftIcon className="w-6 h-6 text-gray-400" /></button>
                            <img src={activeChat?.photoURL || "/logo.png"} className="w-10 h-10 rounded-full border border-white/10 object-cover" alt="" />
                            <div>
                                <h3 className="font-bold text-white text-lg leading-tight">{activeChat?.displayName}</h3>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">En Línea</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2.5 hover:bg-white/10 rounded-full text-gray-500 transition-colors"><PhoneIcon className="w-5 h-5" /></button>
                            <button onClick={closeChat} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-white/[0.01]">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 italic space-y-4">
                                <ChatBubbleLeftRightIcon className="w-12 h-12" />
                                <p className="text-sm">Iniciá una conversación sobre cine...</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => {
                                const isMe = msg.senderId === user?.uid;
                                return (
                                    <div key={msg.id || i} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                                        <div className={cn(
                                            "max-w-[80%] px-4 py-3 rounded-2xl text-sm transition-all shadow-lg",
                                            isMe ? "bg-primary text-black rounded-tr-none font-medium" : "bg-white/10 text-white rounded-tl-none border border-white/5"
                                        )}>
                                            {msg.content?.type === 'movie_share' ? (
                                                <div className="space-y-3">
                                                    <div className="bg-black/20 p-2 rounded-xl flex items-center gap-3 border border-black/10">
                                                        <img src={`https://image.tmdb.org/t/p/w92${msg.content.movie.poster_path}`} className="w-12 h-18 rounded-md shadow-inner" alt="" />
                                                        <div className="truncate">
                                                            <p className="font-bold text-xs truncate uppercase">{msg.content.movie.title}</p>
                                                            <p className="text-[9px] opacity-70">Recomendación</p>
                                                        </div>
                                                    </div>
                                                    {msg.content.text && <p>{msg.content.text}</p>}
                                                </div>
                                            ) : msg.content?.type === 'list_share' ? (
                                                <div className="space-y-3">
                                                    <div className="bg-black/20 p-3 rounded-xl flex items-center gap-3 border border-black/10">
                                                        <div className="p-2 bg-primary/20 rounded-lg"><UsersIcon className="w-5 h-5" /></div>
                                                        <div className="truncate">
                                                            <p className="font-bold text-xs truncate uppercase">{msg.content.list.name}</p>
                                                            <p className="text-[9px] opacity-70">Lista Compartida</p>
                                                        </div>
                                                    </div>
                                                    {msg.content.text && <p>{msg.content.text}</p>}
                                                </div>
                                            ) : (
                                                <p className="leading-relaxed">{msg.content?.text}</p>
                                            )}
                                            <span className={cn("text-[9px] mt-1 block opacity-50 font-mono", isMe ? "text-black/60" : "text-gray-400")}>
                                                {new Date(msg.timestamp?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleSend} className="p-6 border-t border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <input
                                autoFocus
                                type="text"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                placeholder="Escribí un mensaje..."
                                className="flex-1 bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/40 transition-all font-medium"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim()}
                                className="p-4 bg-primary text-black rounded-2xl hover:brightness-110 active:scale-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-30 disabled:active:scale-100"
                            >
                                <PaperAirplaneIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ChatWindow;
