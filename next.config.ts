import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Se quiser silenciar o erro e usar Turbopack puro:
  experimental: {
    turbo: {},
  },
};

export default nextConfig;