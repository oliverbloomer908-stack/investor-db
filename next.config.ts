import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@libsql/client'],
  // Disable Turbopack — use webpack instead (more reliable for native modules)
  experimental: {
    turbo: false,
  },
};

export default nextConfig;
