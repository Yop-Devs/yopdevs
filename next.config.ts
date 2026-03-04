import type { NextConfig } from "next";
import withPWA from "next-pwa";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pwaRuntimeCache = require("./pwa-runtime-cache.js") as Array<unknown>;

const nextConfig: NextConfig = {
  /* Configurações básicas são suficientes para o Next.js 16 */
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