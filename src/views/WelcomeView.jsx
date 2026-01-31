import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

const WelcomeView = () => {
    const { loginWithGoogle } = useAuth();

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black/90 to-black z-0" />
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 flex flex-col items-center text-center max-w-md w-full"
            >
                {/* Logo */}
                <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-white mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                    Frame.
                </h1>

                <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400 mb-6">
                    Tu universo de películas.
                </h2>

                <p className="text-gray-400 text-base sm:text-lg mb-10 leading-relaxed px-4">
                    Por favor, inicia sesión para acceder a todos los beneficios de Frame: guarda tus favoritas, califícalas y sincroniza tu biblioteca.
                </p>

                <button
                    onClick={loginWithGoogle}
                    className="group relative flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-bold text-lg w-full transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_35px_rgba(255,255,255,0.3)] hover:bg-gray-50"
                >
                    {/* Google Icon SVG */}
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Iniciar Sesión con Google
                </button>
            </motion.div>

            <footer className="absolute bottom-6 text-center w-full">
                <p className="text-[10px] sm:text-xs text-gray-700 font-medium tracking-widest uppercase">
                    Designed for Cinema Lovers
                </p>
            </footer>
        </div>
    );
};

export default WelcomeView;
