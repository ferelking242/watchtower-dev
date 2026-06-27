/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#08080f',
          1: '#10101a',
          2: '#16162a',
          3: '#1e1e38',
          4: '#252545',
        },
        accent: {
          red:  '#e53935',
          blue: '#2979ff',
          green:'#00c853',
          gold: '#ffab00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
