/**
 * Prettier configuration with Tailwind CSS class sorting support.
 *
 * The prettier-plugin-tailwindcss plugin automatically sorts utility classes
 * according to the recommended Tailwind CSS order (layout -> spacing ->
 * typography -> colors -> etc.), making class lists consistent across the
 * codebase.
 */
/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
  plugins: ["prettier-plugin-tailwindcss"],
};
