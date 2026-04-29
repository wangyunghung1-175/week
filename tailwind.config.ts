import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:  '#1a3a5c',
        accent:   '#e8872a',
        success:  '#2e8b57',
        danger:   '#c0392b',
        bg:       '#f4f1eb',
        surface:  '#ffffff',
        surface2: '#f9f7f3',
        border:   '#ddd8ce',
      },
      fontFamily: {
        sans: ['Noto Sans TC', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
