/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: '#E8EDE9',
        // Kalshi Color System
        kalshi: {
          50: '#f0fdf9',
          100: '#ccfbf1', 
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488', // Primary Kalshi Green
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Custom brand greens
        brand: {
          green: {
            primary: '#1AAE6F',    // Primary Kalshi Green
            deep: '#0B8A4A',      // Deep Green  
            light: '#EAF6F0',     // Light Green
            soft: '#A7F3D0',      // Soft Mint
            border: '#E8EDE9',    // Border Green
            accent: '#10B981',    // Accent Green
          },
          neutral: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
          }
        },
        // Status colors
        signal: {
          whale: '#F59E0B',      // Amber for whale signals
          volume: '#8B5CF6',     // Purple for volume spikes
          odds: '#EF4444',       // Red for odds flips
          liquidity: '#06B6D4',  // Cyan for liquidity changes
        }
      },
      fontFamily: {
        // Primary: Inter for UI, SF Pro for numbers
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
        numbers: ['SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Typography scale for institutional UI
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        // Custom spacing for card layouts
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        // Card-specific border radius
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        // Glass + micro-shadow system
        'glass': '0 8px 32px 0 rgba(26, 174, 111, 0.1)',
        'glass-sm': '0 2px 8px 0 rgba(26, 174, 111, 0.06)',
        'glass-md': '0 4px 16px 0 rgba(26, 174, 111, 0.08)',
        'glass-lg': '0 8px 32px 0 rgba(26, 174, 111, 0.12)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'glow': '0 0 20px rgba(26, 174, 111, 0.3)',
        'glow-sm': '0 0 10px rgba(26, 174, 111, 0.2)',
        'glow-lg': '0 0 40px rgba(26, 174, 111, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        // Custom animations for pulse, glow, etc.
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glowPulse: {
          '0%': { boxShadow: '0 0 5px rgba(26, 174, 111, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(26, 174, 111, 0.8)' },
        },
      },
      backgroundImage: {
        // Gradient system for cards and buttons
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
        'kalshi-gradient': 'linear-gradient(135deg, #1AAE6F 0%, #0B8A4A 100%)',
        'signal-gradient': 'linear-gradient(135deg, rgba(26, 174, 111, 0.1) 0%, rgba(26, 174, 111, 0.05) 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}