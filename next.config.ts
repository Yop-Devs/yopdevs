import type { NextConfig } from "next";
import withPWA from "next-pwa";
import { buildContentSecurityPolicy } from "./src/lib/csp";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pwaRuntimeCache = require("./pwa-runtime-cache.js") as Array<unknown>;

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
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
  buildExcludes: [/middleware-manifest\.json$/],
});

export default pwaConfig(nextConfig);
