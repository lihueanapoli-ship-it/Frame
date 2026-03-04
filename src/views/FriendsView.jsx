import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import {
    UsersIcon,
    UserPlusIcon,
    MagnifyingGlassIcon,
    ChatBubbleLeftEllipsisIcon,
    ChatBubbleOvalLeftEllipsisIcon,
    CheckIcon,
    XMarkIcon,
    TrashIcon,
    RectangleStackIcon
} from '@heroicons/react/24/outline';
import { UsersIcon as UsersIconSolid } from '@heroicons/react/24/solid';
import { db } from '../api/firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    getDoc,
    deleteDoc,
    setDoc
} from 'firebase/firestore';
import UserSearchModal from '../components/ui/UserSearchModal';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useChat } from '../contexts/ChatContext';

import { CINEMA_RANKS, getRankTitle } from '../constants/cinemaRanks';

const FriendsView = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { openChatWith, unreadPerFriend } = useChat();
    const [activeTab, setActiveTab] = useState('friends');
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [listRequests, setListRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [onlineStatus, setOnlineStatus] = useState({});

    useEffect(() => {
        if (friends.length === 0) return;
        const unsubs = friends.map(friend =>
            onSnapshot(doc(db, 'users', friend.uid), (snap) => {
                setOnlineStatus(prev => ({
                    ...prev,
                    [friend.uid]: snap.data()?.isOnline === true,
                }));
            })
        );
        return () => unsubs.forEach(u => u());
    }, [friends.length]);

    useEffect(() => {
        if (!user) return;

        const qRequests = query(
            collection(db, 'friendRequests'),
            where('toUid', '==', user.uid),
            where('status', '==', 'pending')
        );
        const unsubRequests = onSnapshot(qRequests, (snap) => {
            setRequests(snap.docs.map(d => ({ requestId: d.id, ...d.data() })));
        });

        const qSent = query(
            collection(db, 'friendRequests'),
            where('fromUid', '==', user.uid),
            where('status', '==', 'pending')
        );
        const unsubSent = onSnapshot(qSent, (snap) => {
            setSentRequests(snap.docs.map(d => ({ requestId: d.id, ...d.data() })));
        });

        const qFriends = collection(db, 'users', user.uid, 'friends');
        const unsubFriends = onSnapshot(qFriends, async (snap) => {
            const basicFriends = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

            const friendsWithStats = await Promise.all(basicFriends.map(async (f) => {
                try {
                    const userSnap = await getDoc(doc(db, 'users', f.uid));
                    const watchedCount = userSnap.exists() ? (userSnap.data().watched?.length || 0) : 0;
                    return { ...f, watchedCount };
                } catch (e) {
                    console.error("Error fetching friend stats", e);
                    return { ...f, watchedCount: 0 };
                }
            }));

            setFriends(friendsWithStats);
        });

        const qListReq = query(
            collection(db, 'listRequests'),
            where('toUid', '==', user.uid),
            where('status', '==', 'pending')
        );
        const unsubListReq = onSnapshot(qListReq, (snap) => {
            setListRequests(snap.docs.map(d => ({ requestId: d.id, ...d.data() })));
        });

        return () => {
            unsubRequests();
            unsubSent();
            unsubFriends();
            unsubListReq();
        };
    }, [user]);

    const sendRequest = async (targetUser) => {
        if (targetUser.uid === user.uid) return;

        try {
            await addDoc(collection(db, 'friendRequests'), {
                fromUid: user.uid,
                fromName: user.displayName,
                fromPhoto: user.photoURL,
                toUid: targetUser.uid,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            toast.success(`Solicitud enviada a ${targetUser.displayName}`);
        } catch (e) {
            console.error("Error sending request", e);
            toast.error("No se pudo enviar la solicitud");
        }
    };

    const acceptRequest = async (request) => {
        try {
            const myFriendRef = doc(db, 'users', user.uid, 'friends', request.fromUid);
            await setDoc(myFriendRef, {
                uid: request.fromUid,
                displayName: request.fromName,
                photoURL: request.fromPhoto,
                searchName: request.fromName.toLowerCase(),
                since: serverTimestamp()
            });

            const otherFriendRef = doc(db, 'users', request.fromUid, 'friends', user.uid);
            await setDoc(otherFriendRef, {
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
                since: serverTimestamp()
            });

            await deleteDoc(doc(db, 'friendRequests', request.requestId));

        } catch (e) {
            console.error("Error accepting", e);
        }
    };

    const rejectRequest = async (requestId) => {
        try {
            await deleteDoc(doc(db, 'friendRequests', requestId));
            toast.success("Solicitud eliminada");
        } catch (e) {
            toast.error("Error al eliminar solicitud");
        }
    };

    const removeFriend = async (friend) => {
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'friends', friend.uid));

            try {
                await deleteDoc(doc(db, 'users', friend.uid, 'friends', user.uid));
            } catch (err) {
                console.warn("Could not remove self from friend's list", err);
            }

            toast.success(`${friend.displayName} eliminado de tus amigos.`);
        } catch (e) {
            console.error("Error removing friend", e);
            toast.error("Error al eliminar amigo.");
        }
    };

    const acceptListRequest = async (req) => {
        try {
            await updateDoc(doc(db, 'lists', req.listId), {
                collaborators: arrayUnion(req.fromUid)
            });
            await deleteDoc(doc(db, 'listRequests', req.requestId));
            toast.success("Solicitud de lista aceptada");
        } catch (e) {
            console.error("Error accepting list request", e);
            toast.error("Error al aceptar solicitud");
        }
    };

    const rejectListRequest = async (requestId) => {
        try {
            await deleteDoc(doc(db, 'listRequests', requestId));
            toast.success("Solicitud rechazada");
        } catch (e) {
            toast.error("Error al rechazar");
        }
    };

    const getRelationshipStatus = (targetUid) => {
        if (friends.some(f => f.uid === targetUid)) return 'friend';
        if (sentRequests.some(r => r.toUid === targetUid)) return 'sent';
        if (requests.some(r => r.fromUid === targetUid)) return 'received';
        return 'none';
    };

    return (
        <div className="min-h-screen pb-24 px-4 pt-8">
            <header className="mb-8 md:mb-16 flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-8 gap-8">
                <div className="animate-slide-in-left">
                    <h1 className="text-4xl md:text-7xl font-display font-bold text-white mb-2 tracking-tighter">
                        CÍRCULO <span className="text-primary italic">SOCIAL</span>
                    </h1>
                    <p className="font-mono text-[10px] md:text-xs text-primary/60 uppercase tracking-[0.3em] font-black">
                        PANTALLA COMPARTIDA
                    </p>
                </div>
                <button
                    onClick={() => setIsSearchOpen(true)}
                    className="group flex items-center gap-2 px-5 py-3 md:px-8 md:py-4 bg-white/5 hover:bg-primary hover:text-black hover:font-bold rounded-2xl transition-all border border-white/10 active:scale-95"
                >
                    <UserPlusIcon className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="hidden sm:inline text-xs md:text-sm font-black tracking-widest uppercase">Buscar Amigos</span>
                </button>
            </header>

            <div className="flex p-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl mb-12 items-center max-w-md mx-auto sm:mx-0">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold tracking-tight transition-all duration-500",
                        activeTab === 'friends'
                            ? "bg-white text-black shadow-xl scale-[1.02]"
                            : "text-gray-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <UsersIcon className={cn("w-4 h-4 transition-transform", activeTab === 'friends' && "animate-pulse")} />
                    Amigos
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold tracking-tight transition-all duration-500 relative",
                        activeTab === 'requests'
                            ? "bg-white text-black shadow-xl scale-[1.02]"
                            : ((requests.length > 0 || listRequests.length > 0)
                                ? "animate-alarm text-primary"
                                : "text-gray-500 hover:text-white hover:bg-white/5"
                            )
                    )}
                >
                    <ChatBubbleLeftEllipsisIcon className={cn("w-4 h-4 transition-transform", activeTab === 'requests' && "animate-pulse")} />
                    Solicitudes
                    {(requests.length > 0 || listRequests.length > 0) && activeTab !== 'requests' && (
                        <span className="absolute top-2 right-4 w-2 h-2 bg-primary rounded-full ring-4 ring-primary/20 animate-pulse" />
                    )}
                </button>
            </div>

            <div className="max-w-7xl">
                <AnimatePresence mode="wait">
                    {activeTab === 'friends' ? (
                        <motion.div
                            key="friends-content"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        >
                            {friends.length === 0 ? (
                                <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <UsersIcon className="w-8 h-8 text-gray-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Tu círculo está vacío</h3>
                                    <p className="text-gray-500 max-w-xs mx-auto mb-8">Todavía no has añadido amigos en Frame. El cine es mejor compartido.</p>
                                    <button
                                        onClick={() => setIsSearchOpen(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all"
                                    >
                                        <UserPlusIcon className="w-4 h-4" />
                                        Buscar conocidos
                                    </button>
                                </div>
                            ) : (
                                friends.map(friend => (
                                    <motion.div
                                        key={friend.uid}
                                        whileHover={{ y: -5 }}
                                        onClick={() => navigate(`/u/${friend.uid}`)}
                                        className="flex items-center gap-4 p-5 bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-3xl hover:bg-white/[0.04] hover:border-white/10 transition-all group cursor-pointer"
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img src={friend.photoURL || "/logo.png"} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/5 group-hover:ring-primary/40 transition-all shadow-2xl" />
                                            <div className={cn(
                                                "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-black transition-colors duration-700 shadow-sm",
                                                onlineStatus[friend.uid] ? "bg-green-500" : "bg-red-500"
                                            )} />
                                            {unreadPerFriend[friend.uid] > 0 && (
                                                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] bg-primary border-4 border-black text-black text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-primary/30 animate-bounce">
                                                    {unreadPerFriend[friend.uid] > 9 ? '9+' : unreadPerFriend[friend.uid]}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white group-hover:text-primary transition-colors truncate text-base">{friend.displayName}</h3>
                                            <p className="text-[10px] text-primary/70 font-mono font-black tracking-widest uppercase">
                                                {getRankTitle(friend.watchedCount)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openChatWith(friend);
                                                }}
                                                className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                title="Enviar mensaje"
                                            >
                                                <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`¿Seguro que quieres eliminar a ${friend.displayName}?`)) {
                                                        removeFriend(friend);
                                                    }
                                                }}
                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                                title="Eliminar amigo"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="requests-content"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="max-w-4xl space-y-8"
                        >
                            {requests.length === 0 && listRequests.length === 0 && sentRequests.length === 0 && (
                                <div className="text-center py-24 text-gray-600 border-2 border-dotted border-white/5 rounded-[2rem] bg-white/[0.01]">
                                    <ChatBubbleLeftEllipsisIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                    <p className="font-mono text-sm tracking-widest">NO HAY ACTIVIDAD PENDIENTE</p>
                                </div>
                            )}

                            {requests.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 ml-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Invitaciones recibidas</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {requests.map(req => (
                                            <div key={req.requestId} className="flex items-center justify-between p-5 bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.05] transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <img src={req.fromPhoto || "/logo.png"} alt="" className="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/10" />
                                                    <div>
                                                        <p className="font-bold text-white group-hover:text-primary transition-colors">{req.fromName}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Quiere ser tu amigo</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => acceptRequest(req)} className="p-3 bg-primary text-black rounded-2xl hover:brightness-110 active:scale-90 transition-all shadow-lg shadow-primary/20"><CheckIcon className="w-5 h-5" /></button>
                                                    <button onClick={() => rejectRequest(req.requestId)} className="p-3 bg-white/5 text-gray-400 rounded-2xl hover:text-red-400 hover:bg-red-500/10 transition-all"><XMarkIcon className="w-5 h-5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {listRequests.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 ml-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Colaboración en listas</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {listRequests.map(req => (
                                            <div key={req.requestId} className="flex items-center justify-between p-5 bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.05] transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <img src={req.fromPhoto || "/logo.png"} alt="" className="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/10" />
                                                        <div className="absolute -bottom-1 -right-1 bg-primary text-black p-1 rounded-full border-2 border-black shadow-lg">
                                                            <RectangleStackIcon className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white group-hover:text-primary transition-colors">{req.fromName}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono tracking-tight">Solicita unirse a <span className="text-primary font-bold">{req.listName}</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => acceptListRequest(req)} className="p-3 bg-primary text-black rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-primary/20"><CheckIcon className="w-5 h-5" /></button>
                                                    <button onClick={() => rejectListRequest(req.requestId)} className="p-3 bg-white/5 text-gray-400 rounded-2xl hover:text-red-400 transition-all"><XMarkIcon className="w-5 h-5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {sentRequests.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 ml-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Enviadas</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {sentRequests.map(req => (
                                            <div key={req.requestId} className="flex items-center justify-between p-5 bg-white/[0.01] border border-white/5 rounded-3xl opacity-60 hover:opacity-100 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                                                        <UsersIcon className="w-6 h-6 text-gray-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-300">Solicitud enviada</p>
                                                        <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">Esperando respuesta</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => rejectRequest(req.requestId)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 transition-all">Cancelar</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <UserSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelectUser={(user) => {
                    navigate(`/u/${user.username || user.uid}`);
                    setIsSearchOpen(false);
                }}
            />
        </div>
    );
};

export default FriendsView;

// Build fix verified: 2024-02-15
