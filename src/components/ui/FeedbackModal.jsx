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
    const [answers, setAnswers] = useState({
        overall: 0,
        usability: null, // 'hard', 'medium', 'easy'
        speed: null,     // 'slow', 'ok', 'fast'
        design: 0,
        nps: null        // 0-10 or boolean
    });
    // const [category, setCategory] = useState(null); // REMOVED: Replaced by specific questions
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
    // Categories Logic (REMOVED: Old categories array no longer needed for rendering, kept logic inline)

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
        // Validate: At least one answer or audio is required to submit
        const hasAnswers = answers.overall > 0 || answers.usability || answers.speed || answers.design > 0 || answers.nps !== null;
        if (!hasAnswers && !audioBlob) return;

        setIsSending(true);
        playClick();

        const formData = new FormData();
        const userName = user?.displayName || "Anónimo";
        const userEmail = user?.email || "No especificado";
        const emailSubject = `[Feedback] Encuesta de ${userName}`;

        // --- FormSubmit Config (Estética mejorada) ---
        formData.append("_captcha", "false");
        formData.append("_template", "box");
        formData.append("_subject", emailSubject);
        formData.append("_autoresponse", "¡Recibimos tu feedback! Gracias por ayudarnos a mejorar FRAME 🎬.");

        // --- Datos Principales (Encuesta) ---
        formData.append("👤 Usuario", userName);
        formData.append("📧 Contacto", userEmail);

        // Survey Data - Formatted for readability
        if (answers.overall) formData.append("🌟 Experiencia General", `${answers.overall}/5 Estrellas`);
        if (answers.usability) formData.append("🧠 Usabilidad", answers.usability === 'easy' ? 'Fácil' : answers.usability === 'medium' ? 'Normal' : 'Difícil');
        if (answers.speed) formData.append("⚡ Velocidad", answers.speed === 'fast' ? 'Rápida' : answers.speed === 'ok' ? 'Normal' : 'Lenta');
        if (answers.design) formData.append("🎨 Diseño", `${answers.design}/5 Estrellas`);
        if (answers.nps !== null) formData.append("❤️ Recomendaría", answers.nps ? 'SÍ' : 'NO');

        // --- Telemetría Técnica ---
        formData.append("📱 Dispositivo", techInfo.platform);
        formData.append("🖥️ Resolución", techInfo.screenProb);

        // --- Adjunto ---
        if (audioBlob) {
            // FIX: Use .webm extension as that is the native format of MediaRecorder in browsers.
            // Renaming to .mp3 without encoding causes playback/attachment issues.
            const fileName = `voice_${userName.replace(/\s+/g, '')}_${Date.now()}.webm`;
            const audioFile = new File([audioBlob], fileName, { type: 'audio/webm' });
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
        setAnswers({ overall: 0, usability: null, speed: null, design: 0, nps: null });
        // setCategory(null);
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
                                        {/* 1. SURVEY QUESTIONS (5 steps) */}
                                        <div className="space-y-6 mb-8">

                                            {/* Q1: Overall Experience (10 Stars) */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">1. Experiencia General</label>
                                                <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
                                                    {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
                                                        <button key={star} onClick={() => { setAnswers(p => ({ ...p, overall: star })); playClick(); }} className="focus:outline-none transition-transform active:scale-90 flex-shrink-0">
                                                            <StarIcon className={cn("w-6 h-6 transition-colors", answers.overall >= star ? "text-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" : "text-white/10 hover:text-white/30")} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Q2: Usability (Buttons) */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">2. ¿Qué tan fácil fue usar FRAME?</label>
                                                <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                                                    {[
                                                        { id: 'hard', label: 'Difícil', icon: '😫' },
                                                        { id: 'medium', label: 'Normal', icon: '😐' },
                                                        { id: 'easy', label: 'Facilísimo', icon: '🤩' }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => { setAnswers(p => ({ ...p, usability: opt.id })); playClick(); }}
                                                            className={cn(
                                                                "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                                                                answers.usability === opt.id ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
                                                            )}
                                                        >
                                                            <span>{opt.icon}</span>
                                                            <span>{opt.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Q3: Speed (Buttons) */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">3. ¿La app se sintió rápida?</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { id: 'slow', label: 'Lenta 🐢' },
                                                        { id: 'ok', label: 'Normal 😐' },
                                                        { id: 'fast', label: 'Rápida ⚡' }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => { setAnswers(p => ({ ...p, speed: opt.id })); playClick(); }}
                                                            className={cn(
                                                                "py-2 rounded-lg text-xs font-bold uppercase transition-all border",
                                                                answers.speed === opt.id
                                                                    ? "bg-primary/20 border-primary text-primary"
                                                                    : "bg-transparent border-white/10 text-gray-500 hover:border-white/20"
                                                            )}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Q4: Design (10 Brushes) */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">4. ¿Te gusta el diseño?</label>
                                                <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
                                                    {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
                                                        <button key={star} onClick={() => { setAnswers(p => ({ ...p, design: star })); playClick(); }} className="focus:outline-none transition-transform active:scale-90 flex-shrink-0">
                                                            <PaintBrushIcon className={cn("w-5 h-5 transition-colors", answers.design >= star ? "text-purple-400" : "text-white/10 hover:text-white/30")} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Q5: Recommendation (Yes/No) */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">5. ¿Recomendarías la app?</label>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => { setAnswers(p => ({ ...p, nps: true })); playClick(); }}
                                                        className={cn(
                                                            "flex-1 py-3 rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all",
                                                            answers.nps === true ? "bg-green-500 text-black border-green-500 font-bold" : "bg-white/5 hover:bg-white/10"
                                                        )}
                                                    >
                                                        <HandThumbUpIcon className="w-5 h-5" /> <span>¡Sí, de una!</span>
                                                    </button>
                                                    <button
                                                        onClick={() => { setAnswers(p => ({ ...p, nps: false })); playClick(); }}
                                                        className={cn(
                                                            "px-4 rounded-xl border border-white/10 transition-all",
                                                            answers.nps === false ? "bg-red-500/20 text-red-200 border-red-500" : "bg-white/5 hover:bg-white/10 text-gray-500"
                                                        )}
                                                    >
                                                        <span>No 👎</span>
                                                    </button>
                                                </div>
                                            </div>

                                        </div>

                                        {/* 2. Audio Recorder (Moved to Bottom) */}
                                        <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 mb-8 relative group">
                                            <div className="flex justify-between items-center mb-4">
                                                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                                    BONUS: MENSAJE DE VOZ
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
                                                        <span className="text-sm font-bold tracking-wide">Grabar sugerencia</span>
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
                                                            <span className="text-xs font-bold text-gray-300">Nota de voz lista</span>
                                                        </div>
                                                        <button onClick={deleteRecording} disabled={isSending} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-red-400 transition-colors active:scale-95">
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSending} // Allow sending even with just audio or partial answers
                                            className="w-full py-4 bg-primary text-black font-black rounded-2xl hover:shadow-[0_0_30px_rgba(0,240,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 relative overflow-hidden group/btn"
                                        >
                                            {isSending ? (
                                                <div className="w-5 h-5 border-3 border-black/30 border-t-black rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                                                    <PaperAirplaneIcon className="w-5 h-5 -rotate-12 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                                    <span className="text-sm uppercase tracking-widest">Enviar Todo</span>
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
