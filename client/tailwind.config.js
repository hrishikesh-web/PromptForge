/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Interface text
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Used ONLY for prompt templates and code-like content
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9ddfe',
          300: '#7cc2fd',
          400: '#36a2fa',
          500: '#0c85eb',
          600: '#0067c8',
          700: '#0152a2',
          800: '#054685',
          900: '#0a3c6f'
        }
      }
    }
  },
  plugins: []
};
