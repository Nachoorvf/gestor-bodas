/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'boda-bg': '#FAFAFA', // Off-white minimalista
        'boda-green': {
          light: '#E3EDE7', // Sage muy suave
          DEFAULT: '#8AA692', // Sage elegante
          dark: '#5F7A66'
        },
        'boda-pink': {
          light: '#F8E6E6', // Rose muy suave
          DEFAULT: '#D4A5A5', // Dusty Rose
          dark: '#9E7272'
        },
        'boda-text': '#18181B', // Zinc 900 (Negro suave)
        'boda-text-light': '#71717A', // Zinc 500 (Gris medio)
        'boda-accent': '#C5A065', // Champagne Gold
        'boda-error': '#E11D48', // Rose Red
      },
      fontFamily: {
        script: ['var(--font-script)', 'serif'], // Mapped to Playfair Display
        display: ['var(--font-display)', 'serif'], // Mapped to Cormorant Garamond
        body: ['var(--font-body)', 'sans-serif'], // Mapped to Inter
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'scale-up': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-up': 'scale-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },

  plugins: [],
};