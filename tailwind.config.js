/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#09090b', // Zinc 950 - Deepest Dark
                surface: '#18181b',    // Zinc 900 - Card Surface
                'surface-elevated': '#27272a', // Zinc 800
                primary: '#6366f1',    // Indigo 500 - Primary Action
                'primary-hover': '#4f46e5',
                secondary: '#a1a1aa',  // Zinc 400 - Secondary Text
                action: '#10b981',     // Emerald 500 - Watched/Positive
                danger: '#ef4444',     // Red 500 - Remove/Danger
                glass: 'rgba(24, 24, 27, 0.7)', // Transparent Zinc for glassmorphism
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
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
