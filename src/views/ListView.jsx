import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, LockClosedIcon, GlobeAltIcon, UserGroupIcon, TrashIcon, ShareIcon, PencilIcon, UserPlusIcon, ArrowRightEndOnRectangleIcon } from '@heroicons/react/24/outline';

import { useLists } from '../contexts/ListContext';
import { useAuth } from '../contexts/AuthContext';
import MovieCard from '../components/MovieCard';
import { cn } from '../lib/utils';
import ShareModal from '../components/ui/ShareModal';
import CollaboratorModal from '../components/ui/CollaboratorModal';
import AddToListModal from '../components/ui/AddToListModal';
import ShareWithFriendModal from '../components/ui/ShareWithFriendModal';
import { useChat } from '../contexts/ChatContext';
// Reuse AddToListModal logic? No, move is specific. Let's create a small inline modal or reuse AddTo with a twist.
// Actually `AddToListModal` just adds/removes. 
// If I use `AddToListModal`, I can just check the new list and uncheck the current one manually?
// User asked for "Move". Automated "Add to New + Remove from Old".
// Let's create a specialized `MoveMovieModal` locally or reused.

const MoveMovieModal = ({ isOpen, onClose, movie, currentListId }) => {
    const { allLists, moveMovieBetweenLists } = useLists();

    if (!isOpen) return null;

    // Filter target lists: 
    // 1. Must not be the current list
    // 2. User must have write access (Owner or Collaborator) - 'allLists' from context usually returns lists user has access to.
    // Double check: In ListContext, 'allLists' = 'myLists' + 'collabLists'. Both imply write access usually?
    // Wait, 'collabLists' are lists where I am a collaborator. So yes, I can add to them.
    const targetLists = allLists.filter(l => l.id !== currentListId);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg">Mover película a...</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full"><ArrowRightEndOnRectangleIcon className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {targetLists.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>No tienes otras listas disponibles.</p>
                            <p className="text-xs mt-2">Crea una nueva lista primero.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {targetLists.map(list => (
                                <button
                                    key={list.id}
                                    onClick={async () => {
                                        await moveMovieBetweenLists(currentListId, list.id, movie);
                                        // toast.success(`Movida a ${list.name}`); // Assuming toast is available or imported? Use alert for safety if not.
                                        onClose();
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-left transition-colors group"
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border border-white/10 transition-colors",
                                        "bg-gradient-to-br from-white/5 to-white/0 group-hover:from-primary/20 group-hover:to-primary/5 group-hover:border-primary/30"
                                    )}>
                                        {list.name[0]}
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-sm font-bold text-gray-200 group-hover:text-white block">{list.name}</span>
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{list.movieCount || 0} películas</span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRightEndOnRectangleIcon className="w-4 h-4 text-primary" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ListView = ({ onSelectMovie }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getListById, removeMovieFromList, deleteList, addCollaborator, leaveList } = useLists();

    const [list, setList] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [isCollaborator, setIsCollaborator] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);

    // Move Logic
    const [movieToMove, setMovieToMove] = useState(null);

    useEffect(() => {
        const fetchList = async () => {
            setLoading(true);
            const data = await getListById(id);
            if (data) {
                setList(data);
                if (user) {
                    setIsOwner(data.ownerId === user.uid);
                    setIsCollaborator(data.collaborators?.includes(user.uid));
                }
            }
            setLoading(false);
        };
        fetchList();
    }, [id, user, getListById]);

    const handleDeleteList = async () => {
        if (window.confirm("¿Estás seguro de que quieres eliminar esta lista?")) {
            await deleteList(id);
            navigate('/library');
        }
    };

    const handleLeaveList = async () => {
        if (window.confirm(`¿Seguro que quieres abandonar "${list.name}"?`)) {
            await leaveList(id);
            navigate('/library');
        }
    };

    const handleInvite = () => {
        setIsCollaboratorModalOpen(true);
    };

    const handleRemoveMovie = async (movieId) => {
        if (window.confirm("¿Quitar película de la lista?")) {
            await removeMovieFromList(id, movieId);
            setList(prev => ({
                ...prev,
                movies: prev.movies.filter(m => m.id !== movieId)
            }));
        }
    };

    const [requestLoading, setRequestLoading] = useState(false);
    const [isShareFriendOpen, setIsShareFriendOpen] = useState(false);
    const { openChatWith } = useChat();

    const handleRequestJoin = async () => {
        if (!user) return;
        setRequestLoading(true);
        try {
            await addDoc(collection(db, 'listRequests'), {
                fromUid: user.uid,
                fromName: user.displayName,
                fromPhoto: user.photoURL,
                toUid: list.ownerId, // The list owner
                listId: list.id,
                listName: list.name,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            toast.success("Solicitud enviada al dueño de la lista");
        } catch (error) {
            console.error("Error sending join request", error);
            toast.error("Error al enviar solicitud");
        } finally {
            setRequestLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    if (!list) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Lista no encontrada</h2>
            <button onClick={() => navigate('/library')} className="text-primary hover:underline">Volver a mis listas</button>
        </div>
    );

    const coverImage = list.movies?.[0] ? `https://image.tmdb.org/t/p/original${list.movies[0].poster_path}` : null;
    const canEdit = isOwner || isCollaborator;

    return (
        <div className="min-h-screen pb-20 bg-background">
            <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
                <div className="absolute inset-0 bg-black/40 z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-20" />
                {coverImage ? (
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover blur-md opacity-60 scale-105" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
                )}

                {/* Fixed Back Button - Always visible and returns to previous screen */}
                <button
                    onClick={() => navigate(-1)}
                    className="fixed top-24 left-4 md:left-8 z-50 p-3 bg-black/60 hover:bg-black/90 backdrop-blur-xl rounded-full text-white border border-white/10 shadow-2xl transition-all group hover:scale-105"
                    title="Volver atrás"
                >
                    <ArrowLeftIcon className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>

                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-30 flex flex-col md:flex-row items-end gap-6">
                    <div className="hidden md:grid grid-cols-2 w-48 h-48 rounded-xl overflow-hidden shadow-2xl bg-black/50 backdrop-blur-sm border border-white/10">
                        {list.movies?.slice(0, 4).map(m => (
                            <img key={m.id} src={`https://image.tmdb.org/t/p/w200${m.poster_path}`} className="w-full h-full object-cover" alt="" />
                        ))}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                {list.privacy === 'private' ? <LockClosedIcon className="w-3 h-3" /> : <GlobeAltIcon className="w-3 h-3" />}
                                {list.privacy === 'private' ? 'Privada' : list.privacy === 'friends' ? 'Amigos' : 'Pública'}
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2 leading-none">{list.name}</h1>

                        <div className="flex items-center gap-3">
                            {/* Owner Avatar */}
                            <div className="flex -space-x-3 items-center">
                                <div className="w-10 h-10 rounded-full border-2 border-background bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white z-20 shadow-lg relative tooltip-container group/avatar">
                                    {list.ownerName?.[0]?.toUpperCase()}
                                    <div className="absolute inset-0 rounded-full border border-white/10" />
                                    {/* Tooltip */}
                                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur text-white text-[10px] rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap">
                                        Propietario: {list.ownerName}
                                    </span>
                                </div>

                                {/* Collaborators Avatars */}
                                {list.collaborators?.map((uid, index) => (
                                    <div key={uid} className="w-10 h-10 rounded-full border-2 border-background bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white z-10 shadow-lg relative tooltip-container group/collab">
                                        C{index + 1}
                                        <div className="absolute inset-0 rounded-full border border-white/10" />
                                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur text-white text-[10px] rounded opacity-0 group-hover/collab:opacity-100 transition-opacity whitespace-nowrap">
                                            Colaborador
                                        </span>
                                    </div>
                                ))}

                                {isOwner && (
                                    <button
                                        onClick={handleInvite}
                                        className="w-10 h-10 rounded-full border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/40 transition-all z-0"
                                        title="Añadir amigo"
                                    >
                                        <UserPlusIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-white leading-tight">
                                    {list.ownerName}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                                    {list.collaborators?.length > 0 ? "Lista Compartida" : "Lista Personal"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">

                        {isOwner && (
                            <>
                                <button onClick={handleInvite} className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 backdrop-blur-md transition-colors" title="Invitar Colaborador">
                                    <UserPlusIcon className="w-5 h-5" />
                                </button>
                                <button onClick={handleDeleteList} className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full hover:bg-red-500 hover:text-white backdrop-blur-md transition-colors" title="Eliminar lista">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}

                        {isCollaborator && (
                            <button onClick={handleLeaveList} className="px-5 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full hover:bg-red-500 font-bold hover:text-white backdrop-blur-md transition-all flex items-center gap-2" title="Dejar de colaborar en esta lista">
                                <ArrowRightEndOnRectangleIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">Abandonar</span>
                            </button>
                        )}

                        <button onClick={() => setIsShareFriendOpen(true)} className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 backdrop-blur-md transition-colors" title="Compartir con amigo">
                            <UserGroupIcon className="w-5 h-5" />
                        </button>

                        <button onClick={() => setIsShareOpen(true)} className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 backdrop-blur-md transition-colors" title="Compartir">
                            <ShareIcon className="w-5 h-5" />
                        </button>

                        {!isOwner && !isCollaborator && (
                            <button
                                onClick={handleRequestJoin}
                                disabled={requestLoading}
                                className="px-6 py-3 bg-white/10 text-white font-bold rounded-full hover:bg-white hover:text-black backdrop-blur-md transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <UserPlusIcon className="w-5 h-5" />
                                {requestLoading ? 'Enviando...' : 'Solicitar Colaboración'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {list.movies?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {list.movies.map((movie) => (
                            <div className="relative group" key={movie.id}>
                                <MovieCard movie={movie} onClick={onSelectMovie} />
                                {canEdit && (
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setMovieToMove(movie); }}
                                            className="p-1.5 bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-white hover:text-black transition-colors shadow-lg"
                                            title="Mover a otra lista"
                                        >
                                            <ArrowRightEndOnRectangleIcon className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveMovie(movie.id); }}
                                            className="p-1.5 bg-red-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                                            title="Quitar"
                                        >
                                            <TrashIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                        <p className="text-gray-400 mb-4">Esta lista está vacía.</p>
                        <button onClick={() => navigate('/search')} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">Ir a Explorar</button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isShareOpen && list && (
                    <ShareModal
                        isOpen={isShareOpen}
                        onClose={() => setIsShareOpen(false)}
                        data={{
                            title: list.name,
                            subtitle: `Colección de ${list.ownerName}`,
                            movies: list.movies,
                            type: 'list'
                        }}
                    />
                )}
            </AnimatePresence>

            {isCollaboratorModalOpen && list && (
                <CollaboratorModal
                    isOpen={isCollaboratorModalOpen}
                    onClose={() => setIsCollaboratorModalOpen(false)}
                    listId={list.id}
                    currentCollaborators={list.collaborators || []}
                />
            )}

            {/* Move Movie Modal */}
            {movieToMove && (
                <MoveMovieModal
                    isOpen={!!movieToMove}
                    onClose={() => setMovieToMove(null)}
                    movie={movieToMove}
                    currentListId={list.id}
                />
            )}

            <ShareWithFriendModal
                isOpen={isShareFriendOpen}
                onClose={() => setIsShareFriendOpen(false)}
                type="list"
                payload={list}
            />
        </div>
    );
};

export default ListView;
