import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * En dev local accedemos a la app vía 127.0.0.1:3000 (Spotify OAuth no
   * acepta `localhost` desde 2024). Pero el server Node se bindea como
   * localhost — Next.js 16 los considera cross-origin y bloquea por
   * defecto los recursos /_next/* (incluyendo el bundle del cliente y
   * HMR). Esto rompe la hidratación de los client components.
   *
   * Whitelist explícita para dev:
   */
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
