import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, MicrophoneIcon, StopIcon, TrashIcon, CheckCircleIcon, BugAntIcon, LightBulbIcon, PaintBrushIcon, HeartIcon } from '@heroicons/react/24/outline';
import { StarIcon, HandThumbUpIcon } from '@heroicons/react/24/solid';
import { cn } from '../../lib/utils';
import { useSound } from '../../contexts/SoundContext';
import { useAuth } from '../../contexts/AuthContext';

const FeedbackModal = ({ isOpen, onClose }) => {
    const { playClick, playSuccess, playError } = useSound();
    const { user } = useAuth();

    // Form States
    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState(null); // 'bug', 'idea', 'design', 'other'
    const [submitted, setSubmitted] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Audio States
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);

    // Tech Info (Telemetry)
    const [techInfo, setTechInfo] = useState({});

    // Refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    // Categories Logic
    const categories = [
        { id: 'bug', label: 'Reportar Error', icon: BugAntIcon, color: 'text-red-400', border: 'border-red-400/20', bg: 'bg-red-400/10' },
        { id: 'idea', label: 'Nueva Idea', icon: LightBulbIcon, color: 'text-yellow-400', border: 'border-yellow-400/20', bg: 'bg-yellow-400/10' },
        { id: 'design', label: 'Mejora UI/UX', icon: PaintBrushIcon, color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/10' },
        { id: 'other', label: 'Otro', icon: HeartIcon, color: 'text-pink-400', border: 'border-pink-400/20', bg: 'bg-pink-400/10' },
    ];

    // Capture Telemetry on mount
    useEffect(() => {
        if (isOpen) {
            setTechInfo({
                userAgent: navigator.userAgent,
                screenProb: `${window.screen.width}x${window.screen.height}`,
                windowSize: `${window.innerWidth}x${window.innerHeight}`,
                url: window.location.pathname,
                platform: navigator.platform
            });
        }
    }, [isOpen]);

    // --- Audio Logic (Identical to previous, optimized) ---
    const startRecording = async () => {
        playClick();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
        } catch (error) {
            console.error(error);
            playError?.();
            alert("Acceso al micrófono denegado.");
        }
    };

    const stopRecording = () => {
        playClick();
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const deleteRecording = () => {
        setAudioBlob(null);
        audioChunksRef.current = [];
        playClick();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };
    // -----------------------------------------------------

    const handleSubmit = async () => {
        if (!rating && !category && !audioBlob) return;

        setIsSending(true);
        playClick();

        const formData = new FormData();
        const userName = user?.displayName || "Anónimo";
        const userEmail = user?.email || "No especificado";
        const categoryLabel = categories.find(c => c.id === category)?.label || "General";
        const emailSubject = `[${categoryLabel}] Feedback de ${userName} (${rating}⭐)`;

        // --- FormSubmit Config (Estética mejorada) ---
        formData.append("_captcha", "false");
        formData.append("_template", "box"); // 'box' es más limpio y estético que 'table'
        formData.append("_subject", emailSubject);
        formData.append("_autoresponse", "¡Recibimos tu feedback! Gracias por ayudarnos a mejorar FRAME 🎬."); // Respuesta automática al usuario

        // --- Datos Principales ---
        formData.append("👤 Usuario", userName);
        formData.append("📧 Contacto", userEmail);
        formData.append("🏷️ Categoría", categoryLabel);
        formData.append("⭐ Calificación", `${rating}/5 Estrellas`);

        // --- Telemetría Técnica (Muy útil para devs) ---
        formData.append("📱 Dispositivo", techInfo.platform);
        formData.append("🖥️ Resolución", techInfo.screenProb);
        formData.append("🌐 Navegador", techInfo.userAgent);
        formData.append("📍 URL Reporte", techInfo.url);

        // --- Adjunto ---
        if (audioBlob) {
            const fileName = `voice_${category || 'gnrl'}_${userName.replace(/\s+/g, '')}_${Date.now()}.mp3`;
            const audioFile = new File([audioBlob], fileName, { type: 'audio/mp3' });
            formData.append("attachment", audioFile);
        }

        try {
            const response = await fetch("https://formsubmit.co/lihueanapoli@gmail.com", { method: "POST", body: formData });
            if (response.ok) {
                playSuccess();
                setSubmitted(true);
                setTimeout(handleClose, 2500);
            } else throw new Error("Error envío");
        } catch (error) {
            console.error(error);
            setIsSending(false);
        }
    };

    const handleClose = () => {
        setSubmitted(false);
        setIsSending(false);
        setRating(0);
        setCategory(null);
        setAudioBlob(null);
        setIsRecording(false);
        clearInterval(timerRef.current);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {!submitted && (
                            <button onClick={handleClose} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors z-10"><XMarkIcon className="w-5 h-5" /></button>
                        )}

                        <div className="p-6 md:p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
                            {!submitted ? (
                                <>
                                    <div className="text-center mb-10">
                                        <div className="inline-block p-2 bg-primary/10 rounded-full mb-3 ring-1 ring-primary/20">
                                            <PaperAirplaneIcon className="w-5 h-5 text-primary" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-white mb-2">Ayúdanos a mejorar</h2>
                                        <p className="text-sm text-gray-400">Tu opinión nos ayuda a que FRAME sea mejor cada día.</p>
                                    </div>

                                    {/* 1. Category Selector (Chips) */}
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        {categories.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => { playClick(); setCategory(cat.id); }}
                                                className={cn(
                                                    "flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 group relative overflow-hidden",
                                                    category === cat.id
                                                        ? `${cat.bg} ${cat.border} shadow-[0_0_20px_rgba(255,255,255,0.03)]`
                                                        : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10"
                                                )}
                                            >
                                                {category === cat.id && (
                                                    <motion.div layoutId="category-glow" className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent pointer-events-none" />
                                                )}
                                                <div className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    category === cat.id ? "bg-white/10" : "bg-white/5 group-hover:bg-white/10"
                                                )}>
                                                    <cat.icon className={cn("w-5 h-5 transition-colors", category === cat.id ? cat.color : "text-gray-400 group-hover:text-gray-200")} />
                                                </div>
                                                <span className={cn("text-xs font-bold tracking-wide", category === cat.id ? "text-white" : "text-gray-400 group-hover:text-gray-200")}>{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* 2. Audio Recorder (Compact & Aesthetics) */}
                                    <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 mb-8 relative group">
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                                MENSAJE DE VOZ
                                            </label>
                                            <div className="flex items-center gap-1.5 min-h-[14px]">
                                                {isRecording && <span className="flex w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                                {audioBlob && <span className="text-[10px] text-primary/80 font-bold tracking-wider">ARCHIVO LISTO</span>}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center h-14">
                                            {!isRecording && !audioBlob && (
                                                <button
                                                    onClick={startRecording}
                                                    disabled={isSending}
                                                    className="w-full h-full bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                                                        <MicrophoneIcon className="w-4 h-4 text-red-400" />
                                                    </div>
                                                    <span className="text-sm font-bold tracking-wide">Toca para grabar</span>
                                                </button>
                                            )}

                                            {isRecording && (
                                                <div className="w-full h-full flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex gap-1 h-3 items-end">
                                                            {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
                                                                <motion.div
                                                                    key={i}
                                                                    animate={{ height: ['20%', '100%', '20%'] }}
                                                                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                                                    className="w-0.5 bg-red-400 rounded-full"
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="font-mono text-lg font-medium text-red-200 tabular-nums">{formatTime(recordingTime)}</span>
                                                    </div>
                                                    <button onClick={stopRecording} className="p-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-white shadow-lg transition-all active:scale-90 ring-4 ring-red-500/10">
                                                        <StopIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}

                                            {audioBlob && !isRecording && (
                                                <div className="w-full h-full flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <CheckCircleIcon className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-300">Nota de voz guardada</span>
                                                    </div>
                                                    <button onClick={deleteRecording} disabled={isSending} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-red-400 transition-colors active:scale-95">
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Rating & Submit */}
                                    <div className="mt-auto">
                                        <div className="flex justify-center gap-2 mb-6">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setRating(star)}
                                                    onMouseEnter={() => playClick()}
                                                    disabled={isSending}
                                                    className="group transition-transform active:scale-90 focus:outline-none"
                                                >
                                                    <StarIcon className={cn(
                                                        "w-7 h-7 transition-colors duration-200",
                                                        rating >= star ? "text-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" : "text-gray-700 group-hover:text-gray-500"
                                                    )} />
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={handleSubmit}
                                            disabled={(!rating && !category) || isSending}
                                            className="w-full py-4 bg-primary text-black font-black rounded-2xl hover:shadow-[0_0_30px_rgba(0,240,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 relative overflow-hidden group/btn"
                                        >
                                            {isSending ? (
                                                <div className="w-5 h-5 border-3 border-black/30 border-t-black rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                                                    <PaperAirplaneIcon className="w-5 h-5 -rotate-12 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                                    <span className="text-sm uppercase tracking-widest">Enviar Feedback</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-10 animate-fade-in">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                        <HandThumbUpIcon className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">¡Enviado!</h3>
                                    <p className="text-xs text-gray-500">Gracias, {user.displayName?.split(' ')[0]}.</p>
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
