import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, LockClosedIcon, GlobeAltIcon, UserGroupIcon, TrashIcon, ShareIcon, PencilIcon } from '@heroicons/react/24/outline';
import { PlayIcon } from '@heroicons/react/24/solid';
import { useLists } from '../contexts/ListContext';
import { useAuth } from '../contexts/AuthContext';
import MovieCard from '../components/MovieCard';
import { cn } from '../lib/utils';
import ShareModal from '../components/ui/ShareModal';

const ListView = ({ onSelectMovie }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getListById, removeMovieFromList, deleteList } = useLists();

    const [list, setList] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);

    useEffect(() => {
        const fetchList = async () => {
            setLoading(true);
            const data = await getListById(id);
            if (data) {
                setList(data);
                setIsOwner(user && data.ownerId === user.uid);
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

    const handleRemoveMovie = async (movieId) => {
        if (window.confirm("¿Quitar película de la lista?")) {
            await removeMovieFromList(id, movieId);
            // Update local state simply
            setList(prev => ({
                ...prev,
                movies: prev.movies.filter(m => m.id !== movieId)
            }));
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    if (!list) return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Lista no encontrada</h2>
            <button onClick={() => navigate('/library')} className="text-primary hover:underline">Volver a mis listas</button>
        </div>
    );

    // Cover image logic: Use first movie backdrop or poster
    const coverImage = list.movies?.[0]
        ? `https://image.tmdb.org/t/p/original${list.movies[0].poster_path}`
        : null;

    return (
        <div className="min-h-screen pb-20 bg-background">
            {/* Header Hero */}
            <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
                <div className="absolute inset-0 bg-black/40 z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-20" />

                {coverImage ? (
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover blur-md opacity-60 scale-105" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
                )}

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-24 left-4 md:left-8 z-30 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all"
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>

                {/* List Info */}
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-30 flex flex-col md:flex-row items-end gap-6">
                    {/* Poster Collage / Thumbnail */}
                    <div className="hidden md:grid grid-cols-2 w-48 h-48 rounded-xl overflow-hidden shadow-2xl bg-black/50 backdrop-blur-sm border border-white/10">
                        {list.movies?.slice(0, 4).map(m => (
                            <img key={m.id} src={`https://image.tmdb.org/t/p/w200${m.poster_path}`} className="w-full h-full object-cover" alt="" />
                        ))}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-mono text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                {list.movies?.length || 0} Películas
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                {list.privacy === 'private' ? <LockClosedIcon className="w-3 h-3" /> : <GlobeAltIcon className="w-3 h-3" />}
                                {list.privacy === 'private' ? 'Privada' : list.privacy === 'friends' ? 'Amigos' : 'Pública'}
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-2 leading-none drop-shadow-xl">{list.name}</h1>
                        {list.description && <p className="text-gray-300 max-w-2xl text-lg opacity-90 mb-4">{list.description}</p>}

                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                {list.ownerName?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-300 font-medium">Por <span className="text-white hover:underline cursor-pointer">{list.ownerName}</span></span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button className="flex-1 md:flex-none px-6 py-3 bg-primary text-black font-bold rounded-full hover:bg-white transition-colors flex items-center justify-center gap-2">
                            <PlayIcon className="w-5 h-5" /> Reproducir
                        </button>

                        {isOwner && (
                            <>
                                <button className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 backdrop-blur-md transition-colors" title="Editar detalles">
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                                <button onClick={handleDeleteList} className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full hover:bg-red-500 hover:text-white backdrop-blur-md transition-colors" title="Eliminar lista">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setIsShareOpen(true)}
                            className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 backdrop-blur-md transition-colors"
                            title="Compartir"
                        >
                            <ShareIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Movies Grid */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {list.movies?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {list.movies.map((movie) => (
                            <div className="relative group" key={movie.id}>
                                <MovieCard
                                    movie={movie}
                                    onClick={onSelectMovie}
                                />
                                {isOwner && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveMovie(movie.id); }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg z-20"
                                        title="Quitar"
                                    >
                                        <TrashIcon className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                        <p className="text-gray-400 mb-4">Esta lista está vacía.</p>
                        <button onClick={() => navigate('/search')} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                            Ir a Explorar
                        </button>
                    </div>
                )}
            </div>

            {/* Share Modal Integration */}
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

        </div>
    );
};

export default ListView;
