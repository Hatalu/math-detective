/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#14213D', dblue: '#263C68', gold: '#FCA311', cream: '#FFF8E8',
        teal: '#16866A', alert: '#B93838',
      },
      fontFamily: {
        sans: ['Prompt', '"IBM Plex Sans Thai"', 'sans-serif'],
        num: ['"IBM Plex Sans Thai"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
