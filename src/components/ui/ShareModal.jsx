import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, LinkIcon, ArrowDownTrayIcon, ShareIcon, CheckIcon } from '@heroicons/react/24/outline';
import html2canvas from 'html2canvas';

const ShareModal = ({ isOpen, onClose, data }) => {
    // data expected: { title, subtitle, movies: [], type: 'list'|'profile', url }
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const cardRef = useRef(null);

    if (!isOpen) return null;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleDownloadImage = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            // Wait for images to load ideally, but basic delay helps
            await new Promise(r => setTimeout(r, 500));

            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                scale: 2, // Retina quality
                backgroundColor: '#000000',
                logging: false
            });

            const link = document.createElement('a');
            link.download = `FRAME_${data.title.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Generation failed', err);
            alert('No se pudo generar la imagen. Intenta de nuevo.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'FRAME - ' + data.title,
                    text: `Mira esta colección en FRAME: ${data.title}`,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share canceled');
            }
        } else {
            handleCopyLink();
        }
    };

    // Prepare visuals
    const posterCollage = data.movies?.slice(0, 4) || [];

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-4 flex justify-between items-center border-b border-white/5">
                    <h3 className="text-white font-bold font-display text-lg">Compartir</h3>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-gray-400" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-6">

                    {/* VISUAL CARD PREVIEW (What gets downloaded) */}
                    <div className="relative group shadow-2xl rounded-2xl overflow-hidden">
                        <div
                            ref={cardRef}
                            className="w-[280px] h-[420px] bg-gradient-to-br from-[#1a1a1a] to-black relative flex flex-col p-6 border-[8px] border-white text-center selection:bg-none"
                            style={{ fontFamily: 'Inter, sans-serif' }}
                        >
                            {/* Background Blur */}
                            {posterCollage[0] && (
                                <img
                                    src={`https://image.tmdb.org/t/p/w500${posterCollage[0].poster_path}`}
                                    className="absolute inset-0 w-full h-full object-cover opacity-30 blur-xl grayscale"
                                    crossOrigin="anonymous"
                                    alt=""
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                            {/* Content */}
                            <div className="relative z-10 flex flex-col h-full items-center">
                                {/* Logo */}
                                <div className="mb-4">
                                    <span className="font-bold tracking-widest text-xs border border-white px-2 py-1 text-white uppercase">FRAME</span>
                                </div>

                                {/* Collage */}
                                <div className="grid grid-cols-2 gap-2 w-full aspect-square mb-6">
                                    {posterCollage.map((m, i) => (
                                        <div key={i} className="rounded-lg overflow-hidden relative aspect-[2/3] shadow-lg border border-white/10">
                                            <img
                                                src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                                                className="w-full h-full object-cover"
                                                crossOrigin="anonymous"
                                                alt=""
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-auto pb-4">
                                    <h2 className="text-2xl font-bold text-white font-display leading-tight mb-1">{data.title}</h2>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest">{data.subtitle || 'Colección Personal'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Overlay hint */}
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-white font-bold text-sm flex items-center gap-2"><ArrowDownTrayIcon className="w-4 h-4" /> Vista Previa</span>
                        </div>
                    </div>

                    {/* Main Actions */}
                    <div className="w-full grid grid-cols-2 gap-3">
                        <button
                            onClick={handleNativeShare}
                            className="col-span-2 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <ShareIcon className="w-5 h-5" /> Compartir
                        </button>

                        <button
                            onClick={handleCopyLink}
                            className="py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                        >
                            {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <LinkIcon className="w-5 h-5" />}
                            {copied ? 'Copiado' : 'Copiar Link'}
                        </button>

                        <button
                            onClick={handleDownloadImage}
                            disabled={isGenerating}
                            className="py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <ArrowDownTrayIcon className="w-5 h-5" />
                            )}
                            Guardar Imagen
                        </button>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

export default ShareModal;
