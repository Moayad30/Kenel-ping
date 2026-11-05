/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kernel: {
          bg: "#070C1B",
          navy: "#0B132B",
          slate: "#162238",
          card: "#121C33",
          border: "#1F3152",
          neon: "#00D2FF",
          neonHover: "#33DCFF",
          glow: "rgba(0, 210, 255, 0.25)",
        }
      },
      fontFamily: {
        arabic: ['Noto Sans Arabic', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'sound-wave': 'soundWave 1.2s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 12px rgba(0,210,255,0.7))' },
          '50%': { opacity: 0.5, filter: 'drop-shadow(0 0 4px rgba(0,210,255,0.3))' },
        },
        soundWave: {
          '0%': { height: '6px' },
          '100%': { height: '24px' }
        }
      }
    },
  },
  plugins: [],
}

