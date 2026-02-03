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
                                    <div className="text-center mb-6">
                                        <h2 className="text-xl font-display font-bold text-white mb-1">Feedback Rápido ⚡</h2>
                                        <p className="text-xs text-gray-400">Selecciona, califica y graba. ¡Listo!</p>
                                    </div>

                                    {/* 1. Category Selector (Chips) */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {categories.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => { playClick(); setCategory(cat.id); }}
                                                className={cn(
                                                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 group",
                                                    category === cat.id
                                                        ? `${cat.bg} ${cat.border} ring-1 ring-offset-1 ring-offset-[#0F0F0F] ring-${cat.color.split('-')[1]}-400`
                                                        : "bg-surface-elevated border-white/5 hover:bg-white/5"
                                                )}
                                            >
                                                <cat.icon className={cn("w-6 h-6 mb-2 transition-colors", category === cat.id ? cat.color : "text-gray-500 group-hover:text-gray-300")} />
                                                <span className={cn("text-xs font-semibold", category === cat.id ? "text-white" : "text-gray-500")}>{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* 2. Audio Recorder (Compact & Aesthetics) */}
                                    <div className="bg-surface-elevated rounded-xl p-4 border border-white/5 mb-6">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                                                NOTA DE VOZ (OPCIONAL)
                                            </label>
                                            {audioBlob && <span className="text-[10px] text-green-400 font-mono flex items-center gap-1"><CheckCircleIcon className="w-3 h-3" /> LISTO</span>}
                                        </div>

                                        <div className="flex items-center justify-center gap-4">
                                            {!isRecording && !audioBlob && (
                                                <button onClick={startRecording} disabled={isSending} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all flex items-center justify-center gap-2 group">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full group-hover:animate-pulse" />
                                                    <span className="text-sm font-medium">Grabar</span>
                                                </button>
                                            )}

                                            {isRecording && (
                                                <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                                        <span className="font-mono text-sm text-red-100">{formatTime(recordingTime)}</span>
                                                    </div>
                                                    <button onClick={stopRecording} className="p-1.5 bg-red-500 hover:bg-red-600 rounded-md text-white shadow-lg transition-transform hover:scale-105">
                                                        <StopIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            {audioBlob && !isRecording && (
                                                <div className="flex-1 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                                                    <span className="text-xs font-mono text-emerald-200 truncate max-w-[120px]">Audio adjunto</span>
                                                    <button onClick={deleteRecording} disabled={isSending} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-red-400 transition-colors">
                                                        <TrashIcon className="w-4 h-4" />
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
                                            className="w-full py-3.5 bg-primary text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                                        >
                                            {isSending ? (
                                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <PaperAirplaneIcon className="w-4 h-4" />
                                                    <span>Enviar Feedback</span>
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
