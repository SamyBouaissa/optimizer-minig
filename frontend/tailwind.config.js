/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dofus: {
          dark: '#1a1a2e',
          darker: '#0f0f1a',
          gold: '#d4a84b',
          copper: '#b87333',
          bronze: '#cd7f32',
          silver: '#c0c0c0',
          stone: '#4a4a5c',
          earth: '#5c4a3d',
          green: '#4a7c59'
        }
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Nunito', 'sans-serif']
      }
    },
  },
  plugins: [],
}
