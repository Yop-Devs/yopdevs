import type { NextConfig } from "next";
import withPWA from "next-pwa";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pwaRuntimeCache = require("./pwa-runtime-cache.js") as Array<unknown>;

/** Headers estáticos. CSP dinâmica (com nonce) fica no middleware. */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Next 16 usa Turbopack por defeito; o next-pwa adiciona webpack. Um objeto vazio
  // satisfaz o Next e evita o erro "webpack config and no turbopack config".
  // Para build/dev com PWA, use os scripts com `--webpack` (package.json).
  turbopack: {},
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
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
