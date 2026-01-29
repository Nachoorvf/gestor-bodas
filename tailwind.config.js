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
        'boda-bg': '#F9F7F4', // Fondo crema
        'boda-green': {
          light: '#AEC2B4',
          DEFAULT: '#7E9F87', // Verde oliva
          dark: '#5C7A63'
        },
        'boda-pink': {
          light: '#FAD0C9',
          DEFAULT: '#F4B1A8', // Rosa palo
          dark: '#D98F87'
        },
        'boda-text': '#4A4A4A', // Gris oscuro elegante
        'boda-text-light': '#8C8C8C',
      },
      fontFamily: {
        // Usamos las variables que definimos en layout.js
        script: ['var(--font-script)', 'cursive'], 
        body: ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};