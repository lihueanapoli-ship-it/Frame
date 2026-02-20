import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../api/firebase';
import {
    collection, query, where, onSnapshot, orderBy,
    addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();

    // Which chat window is open right now (friend object: { uid, displayName, photoURL })
    const [openChat, setOpenChat] = useState(null);

    // Total unread count across all chats
    const [totalUnread, setTotalUnread] = useState(0);

    // Listen to all chats that involve the current user to track unread
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
                const unread = data.unreadCount?.[user.uid] || 0;
                count += unread;
            });
            setTotalUnread(count);
        });

        return () => unsub();
    }, [user]);

    const openChatWith = useCallback((friend) => {
        setOpenChat(friend);
    }, []);

    const closeChat = useCallback(() => {
        setOpenChat(null);
    }, []);

    // Send a message (text, movie_share, list_share)
    const sendMessage = useCallback(async (toUid, content) => {
        if (!user || !toUid) return;

        const chatId = getChatId(user.uid, toUid);
        const chatRef = doc(db, 'chats', chatId);

        // Ensure chat doc exists
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
            await setDoc(chatRef, {
                participants: [user.uid, toUid],
                createdAt: serverTimestamp(),
                lastMessage: '',
                lastMessageAt: serverTimestamp(),
                unreadCount: { [toUid]: 0, [user.uid]: 0 }
            });
        }

        // Add message
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            senderId: user.uid,
            senderName: user.displayName,
            senderPhoto: user.photoURL,
            ...content,
            createdAt: serverTimestamp(),
            read: false
        });

        // Update chat metadata
        const lastText = content.type === 'text'
            ? content.text
            : content.type === 'movie_share'
                ? `🎬 ${content.movie?.title}`
                : `📋 Lista: ${content.list?.name}`;

        await updateDoc(chatRef, {
            lastMessage: lastText,
            lastMessageAt: serverTimestamp(),
            [`unreadCount.${toUid}`]: (chatSnap.data()?.unreadCount?.[toUid] || 0) + 1
        });
    }, [user]);

    // Mark chat as read
    const markAsRead = useCallback(async (friendUid) => {
        if (!user || !friendUid) return;
        const chatId = getChatId(user.uid, friendUid);
        const chatRef = doc(db, 'chats', chatId);
        try {
            await updateDoc(chatRef, {
                [`unreadCount.${user.uid}`]: 0
            });
        } catch (_) { /* chat might not exist yet */ }
    }, [user]);

    return (
        <ChatContext.Provider value={{ openChat, openChatWith, closeChat, sendMessage, markAsRead, totalUnread }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
