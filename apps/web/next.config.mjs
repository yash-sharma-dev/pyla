/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for the multi-stage Docker build (apps/web/Dockerfile).
  // Produces a self-contained server bundle in .next/standalone that can
  // be run with `node server.js` without installing node_modules at runtime.
  output: "standalone",
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
