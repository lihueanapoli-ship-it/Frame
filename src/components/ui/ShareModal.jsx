import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ShareIcon, LinkIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, CheckIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

const ShareModal = ({ isOpen, onClose, data }) => {
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);

    const shareUrl = `${window.location.origin}${data.type === 'movie' ? `/movie/${data.id}` : `/lists/${data.id}`}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success("Enlace copiado al portapapeles");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: data.title,
                    text: data.subtitle || 'Mirá esto en FRAME',
                    url: shareUrl,
                });
            } catch (err) {
                console.error(err);
            }
        } else {
            handleCopyLink();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full max-w-7xl h-[92vh] sm:h-[94vh] bg-[#0F0F0F] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Compartir</h3>
                                <div className="h-1 w-8 bg-primary rounded-full mt-1 opacity-50" />
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
                            {/* Preview Card */}
                            <div className="relative group max-w-sm mx-auto">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
                                <div className="relative bg-[#111] border border-white/10 rounded-2xl overflow-hidden p-6 aspect-[9/16] flex flex-col justify-between shadow-2xl">
                                    <div className="flex items-start justify-between">
                                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                                            <ShareIcon className="w-6 h-6 text-primary" />
                                        </div>
                                        <span className="text-[10px] font-mono font-bold tracking-[0.3em] text-white/30 uppercase vertical-text">FRAME APP</span>
                                    </div>

                                    <div>
                                        <h4 className="text-3xl font-display font-bold text-white mb-2 leading-none uppercase tracking-tighter">{data.title}</h4>
                                        <p className="text-primary font-mono text-xs font-bold tracking-widest uppercase">{data.subtitle}</p>
                                        <div className="h-px w-12 bg-white/20 my-4"></div>
                                        <p className="text-[10px] text-gray-500 font-mono leading-relaxed">Descubierto en tu cine personal. FRAME: Enfocá tu pasión.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                <button
                                    onClick={handleCopyLink}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-all group"
                                >
                                    <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary group-hover:text-black transition-all">
                                        {copied ? <CheckIcon className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-white">Copiar enlace</p>
                                        <p className="text-[10px] text-gray-500">Para pegar donde quieras</p>
                                    </div>
                                </button>

                                <button
                                    onClick={handleNativeShare}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-all group"
                                >
                                    <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary group-hover:text-black transition-all">
                                        <DevicePhoneMobileIcon className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-white">Compartir sistema</p>
                                        <p className="text-[10px] text-gray-500">Usar apps nativas</p>
                                    </div>
                                </button>

                                <button
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-all group"
                                >
                                    <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary group-hover:text-black transition-all">
                                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-white">WhatsApp</p>
                                        <p className="text-[10px] text-gray-500">Enviar a un contacto</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-center">
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-full text-sm font-bold text-white transition-all active:scale-95"
                            >
                                Listo
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ShareModal;
