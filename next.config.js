/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // bcrypt uses Node.js native modules and must run on the server
  serverExternalPackages: ["bcrypt"],
};

export default config;
