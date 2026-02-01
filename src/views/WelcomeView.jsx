import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import DynamicLogo from '../components/ui/DynamicLogo';
import { cn } from '../lib/utils';

const DustParticles = () => {
    // Generate random particles
    const particles = Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 10 + 10,
    }));

    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full bg-white blur-[1px]"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                    }}
                    animate={{
                        y: [0, -100, 0], // Float up and down slightly or drift
                        x: [0, Math.random() * 20 - 10, 0],
                        opacity: [0, 0.5, 0],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
            ))}
        </div>
    );
};

const WelcomeView = () => {
    const { loginWithGoogle } = useAuth();
    const [isNight, setIsNight] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        const hour = new Date().getHours();
        setIsNight(hour >= 20 || hour < 6);

        // Try to play ambient sound deeply low volume
        if (audioRef.current) {
            audioRef.current.volume = 0.05;
            // Auto-play policies might block this without interaction
            // We'll leave it ready for interaction
        }
    }, []);

    const handleEnter = async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="relative h-screen w-full bg-black overflow-hidden flex flex-col items-center justify-center text-center px-4">

            {/* 0. Ambient Sound */}
            <audio ref={audioRef} loop>
                <source src="/assets/projector_hum.mp3" type="audio/mpeg" />
            </audio>

            {/* 1. Background Effects */}
            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-10 pointer-events-none" />

            {/* Film Grain (CSS Trick) */}
            <div className="absolute inset-0 opacity-[0.08] z-0 pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />

            {/* Dust Particles */}
            <DustParticles />

            {/* 2. Opening Animation: Anamorphic Light Beam */}
            <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: [0, 1.5, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 2.5, ease: "circOut" }}
                className="absolute top-1/2 left-0 right-0 h-[2px] bg-cyan-400 blur-lg z-20"
            />
            {/* Persistent faint beam */}
            <div className="absolute top-1/2 left-1/4 right-1/4 h-[1px] bg-cyan-500/20 blur-md z-0" />


            {/* 3. Main Content Container */}
            <div className="relative z-30 flex flex-col items-center space-y-8 max-w-2xl">

                {/* Logo Area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="relative group cursor-default"
                >
                    {/* Glowing Aura usually stronger at night */}
                    <div className={cn(
                        "absolute inset-0 rounded-full blur-3xl transition-opacity duration-1000",
                        isNight ? "bg-cyan-500/20 opacity-40" : "bg-cyan-500/10 opacity-20"
                    )} />

                    <div className="transform scale-150 mb-6">
                        <DynamicLogo />
                    </div>
                </motion.div>

                {/* Typography */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.8 }}
                >
                    <h1 className="text-6xl md:text-8xl font-display font-bold text-white tracking-tighter mb-2" style={{ textShadow: "0 0 30px rgba(255,255,255,0.1)" }}>
                        FRAME
                    </h1>
                    <p className="font-mono text-xs md:text-sm text-cyan-500 tracking-[0.2em] uppercase mb-8">
                        Enfocá tu pasión
                    </p>

                    <p className="font-sans text-gray-400 text-lg md:text-xl font-light italic opacity-80 max-w-lg mx-auto leading-relaxed">
                        "La diferencia entre ver y observar está en el registro. <br />
                        <span className="text-white font-medium not-italic">Capturá hoy las películas que vas a querer recordar mañana.</span>"
                    </p>
                </motion.div>

                {/* 4. Action Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.5 }}
                    className="pt-8"
                >
                    <button
                        onClick={handleEnter}
                        className="group relative px-8 py-3 overflow-hidden rounded-sm border border-white/20 hover:border-cyan-500 transition-all duration-500"
                    >
                        <div className="absolute inset-0 w-0 bg-cyan-500 transition-all duration-[250ms] ease-out group-hover:w-full opacity-10" />
                        <span className="relative font-mono text-xs tracking-widest text-white group-hover:text-cyan-400 transition-colors">
                            [ INICIAR SESIÓN ]
                        </span>
                    </button>
                </motion.div>

            </div>

            {/* 5. Footer / Coordinates */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
                className="absolute bottom-6 font-mono text-[10px] text-gray-600 tracking-widest flex items-center gap-4"
            >
                <span>31°25'S 64°11'W</span>
                <span className="opacity-30">|</span>
                <TimeCode />
            </motion.div>

        </div>
    );
};

// Running Timecode Component
const TimeCode = () => {
    const [time, setTime] = useState('');
    useEffect(() => {
        const update = () => {
            const d = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const ms = String(Math.floor(d.getMilliseconds() / 10)).padStart(2, '0');
            setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}:${ms}`);
        };
        const timer = setInterval(update, 41); // ~24fps ish update
        return () => clearInterval(timer);
    }, []);
    return <span>{time}</span>;
}

export default WelcomeView;
