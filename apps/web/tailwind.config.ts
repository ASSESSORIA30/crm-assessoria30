import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        sidebar: { DEFAULT: '#0f172a', hover: '#1e293b', active: '#1e293b', border: '#1e293b' },
      },
    },
  },
  plugins: [],
}
export default config
