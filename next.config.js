/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds where env vars may not be
 * available at build time.
 */

// Load and validate environment variables at startup (uses t3-env).
// This import runs the validation schemas in src/env.js immediately.
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // serverExternalPackages lists native Node.js packages that must run on
  // the server and should NOT be bundled by the Next.js compiler.
  // bcrypt uses native C++ bindings and Prisma SQLite adapters require
  // platform-specific binaries, so they must remain external.
  serverExternalPackages: ["bcrypt", "@prisma/adapter-libsql", "@libsql/client", "libsql"],
};

export default config;
