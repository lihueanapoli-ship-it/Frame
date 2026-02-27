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
            <header className="mb-8 flex items-end justify-between border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2 tracking-tight">
                        CÍRCULO <span className="text-primary">SOCIAL</span>
                    </h1>
                    <p className="font-mono text-[10px] md:text-sm text-gray-400 uppercase tracking-widest">
                        PANTALLA COMPARTIDA
                    </p>
                </div>
                <button
                    onClick={() => setIsSearchOpen(true)}
                    className="group flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-primary hover:text-black hover:font-bold rounded-xl transition-all border border-white/10"
                >
                    <UserPlusIcon className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm">Buscar Amigos</span>
                </button>
            </header>

            <div className="flex p-1 bg-white/5 rounded-2xl mb-8 items-center max-w-sm">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                        activeTab === 'friends'
                            ? "bg-white text-black shadow-lg"
                            : "text-gray-500 hover:text-white"
                    )}
                >
                    <UsersIcon className="w-4 h-4" />
                    Amigos
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative",
                        activeTab === 'requests'
                            ? "bg-white text-black shadow-lg"
                            : ((requests.length > 0 || listRequests.length > 0)
                                ? "animate-alarm text-primary"
                                : "text-gray-500 hover:text-white"
                            )
                    )}
                >
                    <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                    Solicitudes
                    {(requests.length > 0 || listRequests.length > 0) && activeTab !== 'requests' && (
                        <span className="absolute top-2 right-4 w-2 h-2 bg-primary rounded-full animate-pulse" />
                    )}
                </button>
            </div>

            <div className="animate-fade-in">
                {activeTab === 'friends' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {friends.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
                                <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>Aún no tienes amigos en Frame.</p>
                                <button onClick={() => setIsSearchOpen(true)} className="mt-4 text-primary hover:underline">
                                    Buscar gente conocida
                                </button>
                            </div>
                        ) : (
                            friends.map(friend => (
                                <div
                                    key={friend.uid}
                                    onClick={() => navigate(`/u/${friend.uid}`)}
                                    className="flex items-center gap-4 p-4 bg-surface-elevated border border-white/5 rounded-xl hover:border-white/20 transition-all group cursor-pointer hover:bg-white/5"
                                >
                                    <div className="relative overflow-visible flex-shrink-0">
                                        <img src={friend.photoURL || "/logo.png"} alt="" className="w-12 h-12 rounded-full object-cover" />
                                        <div className={cn(
                                            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111] transition-colors duration-700",
                                            onlineStatus[friend.uid] ? "bg-green-500" : "bg-red-500"
                                        )} />
                                        {unreadPerFriend[friend.uid] > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary border-2 border-[#111] text-black text-[8px] font-black rounded-full flex items-center justify-center px-0.5 shadow-lg shadow-primary/50 animate-bounce">
                                                {unreadPerFriend[friend.uid] > 9 ? '9+' : unreadPerFriend[friend.uid]}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white group-hover:text-primary transition-colors">{friend.displayName}</h3>
                                        <p className="text-[10px] text-primary font-mono font-bold tracking-wider">
                                            {getRankTitle(friend.watchedCount)}
                                        </p>
                                    </div>
                                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openChatWith(friend);
                                            }}
                                            className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg group/btn"
                                            title="Enviar mensaje"
                                        >
                                            <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`¿Seguro que quieres eliminar a ${friend.displayName}?`)) {
                                                    removeFriend(friend);
                                                }
                                            }}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg group/btn"
                                            title="Eliminar amigo"
                                        >
                                            <TrashIcon className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="max-w-2xl mx-auto space-y-4">
                        {requests.length === 0 && listRequests.length === 0 && sentRequests.length === 0 && (
                            <div className="text-center py-12 text-gray-500">No hay solicitudes pendientes.</div>
                        )}

                        {requests.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Te han invitado</h3>
                                {requests.map(req => (
                                    <div key={req.requestId} className="flex items-center justify-between p-4 bg-surface-elevated border border-white/10 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <img src={req.fromPhoto || "/logo.png"} alt="" className="w-10 h-10 rounded-full" />
                                            <div>
                                                <p className="font-bold text-sm text-white">{req.fromName}</p>
                                                <p className="text-xs text-gray-500">quiere ser tu amigo</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => acceptRequest(req)} className="p-2 bg-primary text-black rounded-lg hover:opacity-90"><CheckIcon className="w-5 h-5" /></button>
                                            <button onClick={() => rejectRequest(req.requestId)} className="p-2 bg-white/5 text-gray-400 rounded-lg hover:text-red-400 hover:bg-red-500/10"><XMarkIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {listRequests.length > 0 && (
                            <div className="space-y-2 mt-8">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Solicitudes de Listas</h3>
                                {listRequests.map(req => (
                                    <div key={req.requestId} className="flex items-center justify-between p-4 bg-surface-elevated border border-white/10 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img src={req.fromPhoto || "/logo.png"} alt="" className="w-10 h-10 rounded-full" />
                                                <div className="absolute -bottom-1 -right-1 bg-primary text-black p-0.5 rounded-full border border-black">
                                                    <RectangleStackIcon className="w-3 h-3" />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-white">{req.fromName}</p>
                                                <p className="text-xs text-gray-500">quiere unirse a <span className="text-white font-bold">{req.listName}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => acceptListRequest(req)} className="p-2 bg-primary text-black rounded-lg hover:opacity-90"><CheckIcon className="w-5 h-5" /></button>
                                            <button onClick={() => rejectListRequest(req.requestId)} className="p-2 bg-white/5 text-gray-400 rounded-lg hover:text-red-400 hover:bg-red-500/10"><XMarkIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {sentRequests.length > 0 && (
                            <div className="space-y-2 mt-8">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Enviadas</h3>
                                {sentRequests.map(req => (
                                    <div key={req.requestId} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl opacity-70">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                                <UsersIcon className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-300">Solicitud enviada</p>
                                                <p className="text-xs text-gray-500">Esperando respuesta...</p>
                                            </div>
                                        </div>
                                        <button onClick={() => rejectRequest(req.requestId)} className="text-xs text-gray-500 hover:text-red-400 hover:underline">Cancelar</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
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
