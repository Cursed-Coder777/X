/**
 * PostCSS configuration for the project.
 *
 * Uses Tailwind CSS v4 via the @tailwindcss/postcss plugin.
 * Tailwind v4 uses CSS-based configuration (via @import "tailwindcss")
 * inside globals.css instead of the traditional tailwind.config.js.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
