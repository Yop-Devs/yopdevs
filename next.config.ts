import type { NextConfig } from "next";
import withPWA from "next-pwa";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pwaRuntimeCache = require("./pwa-runtime-cache.js") as Array<unknown>;

/**
 * CSP estática via next.config — é o que a Vercel realmente envia no HTTP.
 * (Headers setados só no proxy/middleware não estavam chegando na resposta.)
 * 'unsafe-inline' em script-src é necessário enquanto não houver nonce confiável.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.simpleicons.org https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://viacep.com.br https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
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
