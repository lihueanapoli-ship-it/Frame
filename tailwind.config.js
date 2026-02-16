/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Backgrounds - ahora usando CSS variables
                background: 'var(--color-bg-primary)',
                surface: 'var(--color-bg-secondary)',
                'surface-elevated': 'var(--color-bg-elevated)',
                
                // Brand
                primary: 'var(--color-brand-primary)',
                'primary-hover': 'var(--color-brand-hover)',
                
                // Text
                text: 'var(--color-text-primary)',
                'text-secondary': 'var(--color-text-secondary)',
                'text-tertiary': 'var(--color-text-tertiary)',
                
                // Semantic
                action: 'var(--color-success)',
                danger: 'var(--color-danger)',
                warning: 'var(--color-warning)',
                info: 'var(--color-info)',
                
                // Legacy support (mantener mientras migramos componentes)
                secondary: 'var(--color-text-secondary)',
                glass: 'var(--glass-bg)',
            },
            fontFamily: {
                sans: 'var(--font-sans)',
                display: 'var(--font-display)',
                mono: 'var(--font-mono)',
            },
            spacing: {
                // Extender con tokens si es necesario
                // Tailwind ya tiene un buen sistema de spacing que coincide con nuestros tokens
            },
            borderRadius: {
                // Mapear a tokens
                'sm': 'var(--radius-sm)',
                'DEFAULT': 'var(--radius-md)',
                'md': 'var(--radius-md)',
                'lg': 'var(--radius-lg)',
                'xl': 'var(--radius-xl)',
                '2xl': 'var(--radius-2xl)',
                'full': 'var(--radius-full)',
            },
            boxShadow: {
                'sm': 'var(--shadow-sm)',
                'DEFAULT': 'var(--shadow-md)',
                'md': 'var(--shadow-md)',
                'lg': 'var(--shadow-lg)',
                'xl': 'var(--shadow-xl)',
                '2xl': 'var(--shadow-2xl)',
                'glow': 'var(--glow-brand)',
                'glow-strong': 'var(--glow-brand-strong)',
            },
            backdropBlur: {
                xs: '2px',
                'glass': 'var(--glass-blur)',
                'glass-strong': 'var(--glass-blur-strong)',
            },
            transitionDuration: {
                'instant': 'var(--duration-instant)',
                'fast': 'var(--duration-fast)',
                'DEFAULT': 'var(--duration-normal)',
                'slow': 'var(--duration-slow)',
                'slower': 'var(--duration-slower)',
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
            },
            zIndex: {
                'dropdown': 'var(--z-dropdown)',
                'sticky': 'var(--z-sticky)',
                'fixed': 'var(--z-fixed)',
                'modal-backdrop': 'var(--z-modal-backdrop)',
                'modal': 'var(--z-modal)',
                'popover': 'var(--z-popover)',
                'tooltip': 'var(--z-tooltip)',
            }
        },
    },
    plugins: [],
}
