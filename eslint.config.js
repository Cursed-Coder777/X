/**
 * ESLint flat configuration for the X Clone project.
 *
 * Uses typescript-eslint for TypeScript-aware linting with strict rules.
 * Extends Next.js recommended config for web/core-vitals best practices.
 */

// FlatCompat bridges legacy .eslintrc-style configs (next/core-web-vitals)
// into the new flat config format used by ESLint v9+
import { FlatCompat } from "@eslint/eslintrc";
// typescript-eslint provides TypeScript-specific lint rules
import tseslint from "typescript-eslint";

// Initialize FlatCompat pointing to the current directory
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

// Export the merged flat config array
export default tseslint.config(
  {
    // Ignore the .next build output directory
    ignores: [".next"],
  },
  // Extend Next.js recommended rules (core-web-vitals)
  ...compat.extends("next/core-web-vitals"),
  {
    // Apply TypeScript-specific rules to .ts and .tsx files only
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,          // Recommended TS rules
      ...tseslint.configs.recommendedTypeChecked, // Type-checked rules
      ...tseslint.configs.stylisticTypeChecked,   // Stylistic TS rules
    ],
    rules: {
      // Allow both Array<T> and T[] styles
      "@typescript-eslint/array-type": "off",
      // Allow both type and interface
      "@typescript-eslint/consistent-type-definitions": "off",
      // Enforce inline type imports: import { type Foo } instead of import type { Foo }
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Allow unused vars prefixed with underscore (_)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      // Allow async functions without await
      "@typescript-eslint/require-await": "off",
      // Catch accidentally passing async functions to void-returning attributes
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    // Global linter options
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        // Enable project service for type-aware linting
        projectService: true,
      },
    },
  },
);
