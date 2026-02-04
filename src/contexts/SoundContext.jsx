import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const SoundContext = createContext();

export const useSound = () => {
    return useContext(SoundContext);
};

export const SoundProvider = ({ children }) => {
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('frame_sound_muted');
        return saved === 'true';
    });

    const audioCtxRef = useRef(null);
    const shutterBufferRef = useRef(null);

    // Initialize Audio Context on user interaction (handled lazily)
    const initAudio = () => {
        if (!audioCtxRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
            createShutterBuffer();
        }
        // Resume if suspended (browser policy)
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => { });
        }
    };

    // Auto-resume on first global interaction to fix Browser Warnings
    useEffect(() => {
        const handleInteraction = () => {
            initAudio();
            // Remove listeners once initialized
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        };

        window.addEventListener('click', handleInteraction);
        window.addEventListener('keydown', handleInteraction);

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        };
    }, []);

    const createShutterBuffer = () => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const bufferSize = ctx.sampleRate * 2; // 2 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5; // White noise
        }
        shutterBufferRef.current = buffer;
    };

    const toggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        localStorage.setItem('frame_sound_muted', newState);
    };

    // --- SOUND GENERATORS (Procedural) ---

    const playHover = () => {
        if (isMuted) return;
        initAudio();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    };

    const playClick = () => {
        if (isMuted) return;
        initAudio();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    };

    const playSuccess = () => {
        if (isMuted) return;
        initAudio();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        // Mechanical "Ka-Chick" (Shutter)
        // Part 1: Click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);

        // Part 2: Noise Burst (Mechanical Shutter)
        if (shutterBufferRef.current) {
            const noise = ctx.createBufferSource();
            const noiseGain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            noise.buffer = shutterBufferRef.current;
            filter.type = 'lowpass';
            filter.frequency.value = 800;

            noiseGain.gain.setValueAtTime(0.1, ctx.currentTime);
            noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15); // Short burst

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            noise.start(ctx.currentTime + 0.05); // Slight delay
        }
    };

    const playOn = () => {
        if (isMuted) return;
        initAudio();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Power On / Charge
        osc.type = 'sine';
        osc.frequency.setValueAtTime(50, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.6);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.3);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    }

    return (
        <SoundContext.Provider value={{ isMuted, toggleMute, playHover, playClick, playSuccess, playOn }}>
            {children}
        </SoundContext.Provider>
    );
};
