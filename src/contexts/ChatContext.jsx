import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../api/firebase';
import {
    collection, query, where, onSnapshot,
    addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc, increment
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
        playTone(784, ctx.currentTime, 0.35);
        playTone(988, ctx.currentTime + 0.12, 0.4);
        setTimeout(() => ctx.close(), 1000);
    } catch (_) { /* AudioContext not supported */ }
};

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [openChat, setOpenChat] = useState(null);
    const openChatRef = useRef(null);
    const [totalUnread, setTotalUnread] = useState(0);
    const [unreadPerFriend, setUnreadPerFriend] = useState({}); // { [friendUid]: count }
    const prevChatMeta = useRef({});
    const isFirstLoad = useRef(true);
    // Injected by App.jsx to open the MovieDetail modal
    const openMovieDetailRef = useRef(null);

    // Keep openChatRef in sync
    useEffect(() => {
        openChatRef.current = openChat;
    }, [openChat]);

    // Listen to all chats for unread count + new message notifications
    useEffect(() => {
        if (!user) { setTotalUnread(0); return; }

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            let count = 0;
            const perFriend = {};
            snap.docs.forEach(d => {
                const data = d.data();
                const chatId = d.id;
                const unread = data.unreadCount?.[user.uid] || 0;
                count += unread;

                // Derive the other participant's uid from chatId (uid1_uid2 sorted)
                const otherUid = chatId.split('_').find(id => id !== user.uid);
                if (otherUid && unread > 0) perFriend[otherUid] = unread;

                const lastAt = data.lastMessageAt?.toMillis?.() || 0;
                const lastSenderId = data.lastSenderId;

                if (!isFirstLoad.current && lastSenderId && lastSenderId !== user.uid) {
                    const prevAt = prevChatMeta.current[chatId]?.lastAt || 0;
                    if (lastAt > prevAt) {
                        const otherUid = data.participants.find(p => p !== user.uid);
                        const chatIsOpen = openChatRef.current?.uid === otherUid;

                        if (!chatIsOpen) {
                            playNotificationChime();
                            toast.custom(() => (
                                <div
                                    className="flex items-center gap-3 bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 shadow-2xl cursor-pointer max-w-xs"
                                    onClick={() => {
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
                                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-[#1a1a1a] animate-ping" />
                                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-[#1a1a1a]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white">{data.lastSenderName || 'Nuevo mensaje'}</p>
                                        <p className="text-xs text-gray-400 truncate">{data.lastMessage || '...'}</p>
                                    </div>
                                    <span className="text-[10px] text-primary font-mono shrink-0">Abrir →</span>
                                </div>
                            ), { duration: 6000, position: 'top-right' });
                        }
                    }
                }

                prevChatMeta.current[chatId] = { lastAt };
            });

            isFirstLoad.current = false;
            setTotalUnread(count);
            setUnreadPerFriend(perFriend);
        });

        return () => unsub();
    }, [user]);

    const openChatWith = useCallback((friend) => {
        setOpenChat(friend);
    }, []);

    const closeChat = useCallback(() => {
        setOpenChat(null);
    }, []);

    // Called by App.jsx to register the setSelectedMovie setter
    const setOpenMovieDetailFn = useCallback((fn) => {
        openMovieDetailRef.current = fn;
    }, []);

    // Used by ChatWindow to open a movie in the detail modal
    const openMovieDetail = useCallback((movie) => {
        openMovieDetailRef.current?.(movie);
    }, []);

    /**
     * Send a message (text, movie_share, list_share) to a friend.
     * Flow:
     *   1. getDoc → check if chat exists
     *   2. If not: setDoc to create it
     *   3. addDoc to write the message to subcollection
     *   4. updateDoc to update metadata + increment unread counter (supports dotted paths)
     */
    const sendMessage = useCallback(async (toUid, content) => {
        if (!user || !toUid) return;

        const chatId = getChatId(user.uid, toUid);
        const chatRef = doc(db, 'chats', chatId);

        try {
            // 1. Check if chat doc exists
            const chatSnap = await getDoc(chatRef);

            if (!chatSnap.exists()) {
                // 2. Create the chat document
                await setDoc(chatRef, {
                    participants: [user.uid, toUid],
                    createdAt: serverTimestamp(),
                    lastMessage: '',
                    lastMessageAt: serverTimestamp(),
                    lastSenderId: '',
                    lastSenderName: '',
                    lastSenderPhoto: '',
                    unreadCount: { [user.uid]: 0, [toUid]: 0 }
                });
            }

            // 3. Write the message to the subcollection
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                senderId: user.uid,
                senderName: user.displayName || 'Usuario',
                senderPhoto: user.photoURL || '',
                ...content,
                createdAt: serverTimestamp(),
            });

            // Build preview text for the chat doc
            const lastText = content.type === 'text'
                ? content.text
                : content.type === 'movie_share'
                    ? `🎬 ${content.movie?.title}`
                    : `📋 ${content.list?.name}`;

            // 4. Update chat metadata
            // updateDoc supports dotted field paths + FieldValue.increment natively
            await updateDoc(chatRef, {
                lastMessage: lastText,
                lastMessageAt: serverTimestamp(),
                lastSenderId: user.uid,
                lastSenderName: user.displayName || 'Usuario',
                lastSenderPhoto: user.photoURL || '',
                [`unreadCount.${toUid}`]: increment(1),
            });

        } catch (error) {
            console.error('[Chat] Error sending message:', error);
            toast.error('No se pudo enviar el mensaje. Intentá de nuevo.');
            throw error;
        }
    }, [user]);

    // Mark chat as read (reset unread counter for current user)
    const markAsRead = useCallback(async (friendUid) => {
        if (!user || !friendUid) return;
        const chatId = getChatId(user.uid, friendUid);
        const chatRef = doc(db, 'chats', chatId);
        try {
            const snap = await getDoc(chatRef);
            if (!snap.exists()) return; // Chat doesn't exist yet, nothing to mark
            await updateDoc(chatRef, {
                [`unreadCount.${user.uid}`]: 0
            });
        } catch (e) {
            // Non-critical, ignore
            console.warn('[Chat] markAsRead failed:', e.message);
        }
    }, [user]);

    return (
        <ChatContext.Provider value={{
            openChat, openChatWith, closeChat,
            sendMessage, markAsRead,
            totalUnread, unreadPerFriend,
            openMovieDetail, setOpenMovieDetailFn
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
