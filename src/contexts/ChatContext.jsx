import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../api/firebase';
import {
    collection, query, where, onSnapshot, orderBy,
    addDoc, serverTimestamp, doc, setDoc, updateDoc, increment
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const ChatContext = createContext(null);

export const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

// ── Subtle notification chime via Web Audio API ──────────────────────────────
const playNotificationChime = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        const playTone = (freq, startTime, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        // Gentle two-note chime: G5 → B5
        playTone(784, ctx.currentTime, 0.35);         // G5
        playTone(988, ctx.currentTime + 0.12, 0.4);   // B5

        setTimeout(() => ctx.close(), 1000);
    } catch (_) { /* AudioContext not supported */ }
};

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();

    // Which chat window is open (friend object: { uid, displayName, photoURL })
    const [openChat, setOpenChat] = useState(null);
    const openChatRef = useRef(null); // sync ref for notification check

    // Total unread count
    const [totalUnread, setTotalUnread] = useState(0);

    // Track last known message timestamps per chat to detect new ones
    const prevChatMeta = useRef({});
    const isFirstLoad = useRef(true);

    // Listen to all chats involving the current user
    useEffect(() => {
        if (!user) { setTotalUnread(0); return; }

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            let count = 0;

            snap.docs.forEach(d => {
                const data = d.data();
                const chatId = d.id;
                const unread = data.unreadCount?.[user.uid] || 0;
                count += unread;

                const lastAt = data.lastMessageAt?.toMillis?.() || 0;
                const lastSenderId = data.lastSenderId;

                // Detect new message from another user (skip first snapshot)
                if (!isFirstLoad.current && lastSenderId && lastSenderId !== user.uid) {
                    const prevAt = prevChatMeta.current[chatId]?.lastAt || 0;
                    if (lastAt > prevAt) {
                        // Check if this chat is currently open and focused
                        const currentOpenUid = openChatRef.current?.uid;
                        const otherUid = data.participants.find(p => p !== user.uid);
                        const chatIsOpen = currentOpenUid === otherUid;

                        if (!chatIsOpen) {
                            playNotificationChime();
                            toast.custom(() => (
                                <div
                                    className="flex items-center gap-3 bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 shadow-2xl cursor-pointer"
                                    onClick={() => {
                                        // Find and open the chat with this friend
                                        setOpenChat({
                                            uid: otherUid,
                                            displayName: data.lastSenderName || 'Amigo',
                                            photoURL: data.lastSenderPhoto || ''
                                        });
                                        toast.dismiss();
                                    }}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img
                                            src={data.lastSenderPhoto || '/logo.png'}
                                            alt=""
                                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                                        />
                                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-[#1a1a1a]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white">{data.lastSenderName || 'Nuevo mensaje'}</p>
                                        <p className="text-xs text-gray-400 truncate">{data.lastMessage || '...'}</p>
                                    </div>
                                    <span className="text-[10px] text-primary font-mono">Ver</span>
                                </div>
                            ), { duration: 5000, position: 'top-right' });
                        }
                    }
                }

                prevChatMeta.current[chatId] = { lastAt };
            });

            isFirstLoad.current = false;
            setTotalUnread(count);
        });

        return () => unsub();
    }, [user]);

    const openChatWith = useCallback((friend) => {
        setOpenChat(friend);
        openChatRef.current = friend;
    }, []);

    const closeChat = useCallback(() => {
        setOpenChat(null);
        openChatRef.current = null;
    }, []);

    // Send a message — robust version with setDoc merge + increment
    const sendMessage = useCallback(async (toUid, content) => {
        if (!user || !toUid) return;

        const chatId = getChatId(user.uid, toUid);
        const chatRef = doc(db, 'chats', chatId);

        const lastText = content.type === 'text'
            ? content.text
            : content.type === 'movie_share'
                ? `🎬 ${content.movie?.title}`
                : `📋 ${content.list?.name}`;

        // 1. Ensure chat document exists (merge = non-destructive)
        await setDoc(chatRef, {
            participants: [user.uid, toUid],
            createdAt: serverTimestamp(),
            unreadCount: { [user.uid]: 0, [toUid]: 0 }, // initial values (merge won't overwrite existing)
        }, { merge: true });

        // 2. Add the message to subcollection
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            senderId: user.uid,
            senderName: user.displayName || 'Usuario',
            senderPhoto: user.photoURL || '',
            ...content,
            createdAt: serverTimestamp(),
        });

        // 3. Update chat metadata — use increment to avoid race conditions
        await setDoc(chatRef, {
            lastMessage: lastText,
            lastMessageAt: serverTimestamp(),
            lastSenderId: user.uid,
            lastSenderName: user.displayName || 'Usuario',
            lastSenderPhoto: user.photoURL || '',
            [`unreadCount.${toUid}`]: increment(1),
        }, { merge: true });

    }, [user]);

    // Mark chat as read
    const markAsRead = useCallback(async (friendUid) => {
        if (!user || !friendUid) return;
        const chatId = getChatId(user.uid, friendUid);
        const chatRef = doc(db, 'chats', chatId);
        try {
            await setDoc(chatRef, {
                [`unreadCount.${user.uid}`]: 0
            }, { merge: true });
        } catch (_) { /* chat might not exist yet */ }
    }, [user]);

    // Keep openChatRef in sync when openChat state changes externally
    useEffect(() => {
        openChatRef.current = openChat;
    }, [openChat]);

    return (
        <ChatContext.Provider value={{ openChat, openChatWith, closeChat, sendMessage, markAsRead, totalUnread }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
