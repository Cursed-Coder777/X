/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Native Node.js packages that must run on the server, not bundled
  serverExternalPackages: ["bcrypt", "@prisma/adapter-libsql", "@libsql/client", "libsql"],
};

export default config;
