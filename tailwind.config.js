/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#050505', // Onyx Black
                surface: '#121212',    // Slightly Lighter Onyx
                'surface-elevated': '#1F1F1F',
                primary: '#00F0FF',    // Anamorphic Blue
                'primary-hover': '#00C2CF',
                secondary: '#A1A1AA',
                text: '#E0E0E0',       // Nitrate White
                action: '#10b981',
                danger: '#ef4444',
                glass: 'rgba(5, 5, 5, 0.7)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['"Bebas Neue"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
