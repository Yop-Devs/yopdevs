import type { NextConfig } from "next";
import withPWA from "next-pwa";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pwaRuntimeCache = require("./pwa-runtime-cache.js") as Array<unknown>;

const nextConfig: NextConfig = {
  // Next 16 usa Turbopack por defeito; o next-pwa adiciona webpack. Um objeto vazio
  // satisfaz o Next e evita o erro "webpack config and no turbopack config".
  // Para build/dev com PWA, use os scripts com `--webpack` (package.json).
  turbopack: {},
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  scope: "/",
  runtimeCaching: pwaRuntimeCache,
  // Não precachear rotas de API; SW só em produção (HTTPS na Vercel)
  buildExcludes: [/middleware-manifest\.json$/],
});

export default pwaConfig(nextConfig);