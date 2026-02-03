import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import { StarIcon, HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/solid';
import { cn } from '../../lib/utils';
import { useSound } from '../../contexts/SoundContext';

const FeedbackModal = ({ isOpen, onClose }) => {
    const { playClick, playSuccess } = useSound();
    const [rating, setRating] = useState(0);
    const [suggestion, setSuggestion] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        playSuccess();
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setRating(0);
            setSuggestion('');
            onClose();
        }, 2000);
    };

    const handleMailTo = () => {
        const subject = "Feedback de Audio para FRAME";
        const body = "Hola Lihue,%0D%0A%0D%0ATe envío este correo para compartirte una nota de voz con mis sugerencias.%0D%0A%0D%0A(Adjunta tu archivo de audio aquí)";
        window.location.href = `mailto:lihueanapoli@gmail.com?subject=${subject}&body=${body}`;
        playClick();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-10"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>

                        <div className="p-8">
                            {!submitted ? (
                                <>
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-display font-bold text-white mb-2">Tu opinión es nuestro guión 🎬</h2>
                                        <p className="text-sm text-gray-400">Ayúdanos a dirigir la próxima escena de esta aplicación.</p>
                                    </div>

                                    {/* 1. Quick Rating */}
                                    <div className="mb-8 text-center">
                                        <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-3">
                                            ¿Qué tal tu experiencia hoy?
                                        </label>
                                        <div className="flex justify-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setRating(star)}
                                                    onMouseEnter={() => playClick()}
                                                    className="group focus:outline-none transition-transform active:scale-95"
                                                >
                                                    <StarIcon className={cn(
                                                        "w-8 h-8 transition-colors",
                                                        rating >= star ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-gray-700 group-hover:text-gray-500"
                                                    )} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 2. Text Feedback */}
                                    <div className="mb-8">
                                        <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-3">
                                            ¿Qué falta? ¿Qué sobra?
                                        </label>
                                        <textarea
                                            value={suggestion}
                                            onChange={(e) => setSuggestion(e.target.value)}
                                            placeholder="Escribe tus sugerencias aquí..."
                                            className="w-full h-24 bg-surface-elevated border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none resize-none transition-all"
                                        />
                                    </div>

                                    {/* 3. Audio Feedback (Premium Feature) */}
                                    <div
                                        onClick={handleMailTo}
                                        className="mb-8 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-primary/20 transition-all group relative overflow-hidden"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                            <MicrophoneIcon className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">Envíanos un Audio</h4>
                                            <p className="text-xs text-gray-400 leading-relaxed">
                                                Cuéntanos tu idea o queja con tu propia voz. Haz click para abrir tu correo.
                                            </p>
                                        </div>
                                        {/* Animation ping */}
                                        <div className="absolute top-1/2 right-4 -translate-y-1/2">
                                            <span className="flex h-3 w-3 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!rating && !suggestion}
                                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <PaperAirplaneIcon className="w-5 h-5" />
                                        Enviar Feedback
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-12 animate-fade-in">
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <HandThumbUpIcon className="w-10 h-10 text-green-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">¡Mensaje Recibido!</h3>
                                    <p className="text-gray-400">Gracias por ayudarnos a ser mejores.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default FeedbackModal;
