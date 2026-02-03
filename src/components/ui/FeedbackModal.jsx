import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, MicrophoneIcon, StopIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { StarIcon, HandThumbUpIcon } from '@heroicons/react/24/solid';
import { cn } from '../../lib/utils';
import { useSound } from '../../contexts/SoundContext';
import { useAuth } from '../../contexts/AuthContext'; // Import Auth

const FeedbackModal = ({ isOpen, onClose }) => {
    const { playClick, playSuccess, playError } = useSound();
    const { user } = useAuth(); // Get User Data
    const [rating, setRating] = useState(0);
    const [suggestion, setSuggestion] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Recording States
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);

    // Refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    // Start Recording
    const startRecording = async () => {
        playClick();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                // Create Blob (Defaulting to webm, but we'll label it differently later)
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);

            // Timer
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            playError?.();
            alert("No pudimos acceder al micrófono. Por favor verifica los permisos.");
        }
    };

    // Stop Recording
    const stopRecording = () => {
        playClick();
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    // Discard Recording
    const deleteRecording = () => {
        setAudioBlob(null);
        audioChunksRef.current = [];
        playClick();
    };

    // Format time mm:ss
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Submit to FormSubmit
    const handleSubmit = async () => {
        if (!rating && !suggestion && !audioBlob) return;

        setIsSending(true);
        playClick();

        const formData = new FormData();

        // 1. User Identity
        const userName = user?.displayName || "Anónimo";
        const userEmail = user?.email || "No especificado";

        // FormSubmit Configuration
        formData.append("_captcha", "false");
        formData.append("_subject", `Feedback de ${userName} - ${new Date().toLocaleDateString()}`);
        formData.append("_template", "table");

        // Identity Fields (Will appear in email body)
        formData.append("Usuario", userName);
        formData.append("Email", userEmail);

        // Content
        formData.append("Calificación", `${rating} / 5 Estrellas`);
        formData.append("Sugerencia", suggestion || "Sin texto");

        // Attach Audio
        if (audioBlob) {
            // HACK: Force .mp3 extension as requested. 
            // Note: Modern players (VLC, Gmail Preview) often play WebM renamed as mp3/mp4 headers notwithstanding.
            const fileName = `audio_${userName.replace(/\s+/g, '_')}_${Date.now()}.mp3`;
            const audioFile = new File([audioBlob], fileName, { type: 'audio/mp3' });
            formData.append("attachment", audioFile);
        }

        try {
            // Send to FormSubmit
            const response = await fetch("https://formsubmit.co/lihueanapoli@gmail.com", {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                playSuccess();
                setSubmitted(true);
                setTimeout(() => {
                    handleClose();
                }, 3000);
            } else {
                throw new Error("Error en el envío");
            }
        } catch (error) {
            console.error("Error sending feedback:", error);
            alert("Hubo un problema enviando el feedback. Intenta de nuevo.");
            setIsSending(false);
        }
    };

    const handleClose = () => {
        setSubmitted(false);
        setIsSending(false);
        setRating(0);
        setSuggestion('');
        setAudioBlob(null);
        setIsRecording(false);
        clearInterval(timerRef.current);
        onClose();
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
                        onClick={handleClose}
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
                        {!submitted && (
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-10"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        )}

                        <div className="p-8">
                            {!submitted ? (
                                <>
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-display font-bold text-white mb-2">Tu opinión es nuestro guión 🎬</h2>
                                        <p className="text-sm text-gray-400">
                                            Ayúdanos a mejorar, {user?.displayName?.split(' ')[0] || 'cinéfilo'}.
                                        </p>
                                    </div>

                                    {/* 1. Quick Rating */}
                                    <div className="mb-6 text-center">
                                        <div className="flex justify-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setRating(star)}
                                                    onMouseEnter={() => playClick()}
                                                    className="group focus:outline-none transition-transform active:scale-95"
                                                    disabled={isSending}
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
                                    <div className="mb-6">
                                        <textarea
                                            value={suggestion}
                                            onChange={(e) => setSuggestion(e.target.value)}
                                            placeholder="¿Qué mejorarías? Escribe aquí..."
                                            disabled={isSending}
                                            className="w-full h-24 bg-surface-elevated border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none resize-none transition-all"
                                        />
                                    </div>

                                    {/* 3. Audio Recording Section */}
                                    <div className="mb-8">
                                        <label className="block text-xs font-mono uppercase tracking-widest text-gray-500 mb-3 text-center">
                                            NOTA DE VOZ
                                        </label>

                                        <div className="flex flex-col items-center justify-center gap-4 bg-surface-elevated rounded-xl p-4 border border-white/5">
                                            {!isRecording && !audioBlob && (
                                                <button
                                                    onClick={startRecording}
                                                    disabled={isSending}
                                                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all group border border-white/10"
                                                >
                                                    <div className="w-3 h-3 bg-red-500 rounded-full group-hover:animate-pulse" />
                                                    <span className="font-semibold text-sm">Grabar Audio</span>
                                                </button>
                                            )}

                                            {isRecording && (
                                                <div className="flex flex-col items-center gap-3 w-full">
                                                    <div className="flex items-center gap-4 w-full justify-center">
                                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                                                        <span className="font-mono text-xl text-white tracking-widest">{formatTime(recordingTime)}</span>
                                                    </div>
                                                    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full bg-red-500"
                                                            animate={{ width: ["0%", "100%"] }}
                                                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={stopRecording}
                                                        className="mt-2 p-3 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                                                    >
                                                        <StopIcon className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            )}

                                            {audioBlob && !isRecording && (
                                                <div className="flex items-center justify-between w-full bg-green-500/10 border border-green-500/20 px-4 py-3 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircleIcon className="w-6 h-6 text-green-500" />
                                                        <div>
                                                            <p className="text-sm font-bold text-white">Audio Grabado</p>
                                                            <p className="text-xs text-green-400 font-mono">Adjunto como .mp3</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={deleteRecording}
                                                        disabled={isSending}
                                                        className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400 transition-colors"
                                                        title="Eliminar audio"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={(!rating && !suggestion && !audioBlob) || isSending}
                                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden"
                                    >
                                        {isSending ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <PaperAirplaneIcon className="w-5 h-5" />
                                                Enviar Feedback
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-12 animate-fade-in flex flex-col items-center">
                                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 relative">
                                        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                                        <HandThumbUpIcon className="w-12 h-12 text-green-500 relative z-10" />
                                    </div>
                                    <h3 className="text-3xl font-display font-bold text-white mb-2">¡Recibido!</h3>
                                    <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">
                                        Gracias por tu feedback, {user?.displayName?.split(' ')[0]}. <br />
                                        Lo tendremos muy en cuenta.
                                    </p>
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
