/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  // We disable Preflight (Tailwind's CSS reset) so the browser's native
  // defaults survive: link colors, heading sizes, list bullets, etc.
  // Tailwind here is used ONLY for layout utilities (max-w, grid, flex, gap...).
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
