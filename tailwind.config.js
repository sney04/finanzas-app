/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eaf3f2',
          100: '#cfe3e1',
          200: '#a3c8c4',
          300: '#6fa9a3',
          400: '#3f8a82',
          500: '#0b3d3a', // color principal (verde azulado profundo)
          600: '#0a3532',
          700: '#082a28',
          800: '#06201e',
          900: '#041615',
        },
        gold: {
          400: '#e6bb6a',
          500: '#d9a441', // acento dorado (dinero)
          600: '#b88630',
        },
        surface: {
          light: '#f7f6f3',
          dark: '#0f1b1a',
        },
      },
      boxShadow: {
        soft: '0 4px 20px -4px rgba(11, 61, 58, 0.15)',
      },
    },
  },
  plugins: [],
}
